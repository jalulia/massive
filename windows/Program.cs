using System.Diagnostics;
using System.Runtime.InteropServices;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

internal static class Program
{
    internal static readonly string UserRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "MASSIVE95");
    internal static bool Smoke;
    [STAThread] static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize(); Directory.CreateDirectory(UserRoot);
        string arg = args.FirstOrDefault()?.ToLowerInvariant() ?? "/c";
        Smoke = arg == "--smoke-test";
        bool run = arg.StartsWith("/s") || arg.StartsWith("-s");
        bool preview = arg.StartsWith("/p") || arg.StartsWith("-p");
        nint parent = 0;
        if (preview) {
            string handle = arg.Contains(':') ? arg.Split(':',2)[1] : args.ElementAtOrDefault(1) ?? "";
            if (!long.TryParse(handle.Trim(), out long raw) || raw == 0) return;
            parent = (nint)raw;
        }
        try {
            CoreWebView2Environment.GetAvailableBrowserVersionString();
            using var context = new SaverContext(run, preview, parent);
            Application.Run(context);
        } catch(Exception ex) {
            File.WriteAllText(Path.Combine(UserRoot,"last-error.txt"),ex.ToString());
            if (!run && !preview && !Smoke) MessageBox.Show("MASSIVE 95 needs Microsoft Edge WebView2 Runtime. Install the Evergreen Runtime from Microsoft's WebView2 website, then try again.\n\n" + ex.Message,"MASSIVE 95",MessageBoxButtons.OK,MessageBoxIcon.Information);
            Environment.ExitCode = 1;
        }
    }
}
internal sealed class SaverContext : ApplicationContext
{
    readonly List<SaverForm> forms = new();
    public SaverContext(bool run,bool preview,nint parent) {
        foreach(var screen in run ? Screen.AllScreens : new[]{Screen.PrimaryScreen!}) {
            var form = new SaverForm(run,preview,parent,screen.Bounds,()=>ExitThread());
            forms.Add(form); form.FormClosed += (_,_)=>ExitThread(); form.Show();
        }
    }
    protected override void ExitThreadCore() { foreach(var f in forms.ToArray()) if(!f.IsDisposed) f.Hide(); base.ExitThreadCore(); }
    protected override void Dispose(bool disposing) { if(disposing) foreach(var f in forms) f.Dispose();base.Dispose(disposing); }
}
internal sealed class SaverForm : Form
{
    readonly WebView2 web = new(){Dock=DockStyle.Fill,DefaultBackgroundColor=Color.Black};
    readonly bool run,preview; readonly nint parent; readonly Action exit;
    readonly System.Windows.Forms.Timer inputTimer=new(){Interval=100};
    readonly Stopwatch lifetime=Stopwatch.StartNew(); Point startMouse; uint initialInput;
    public SaverForm(bool running,bool previewing,nint parentHandle,Rectangle bounds,Action closeAll) {
        run=running;preview=previewing;parent=parentHandle;exit=closeAll;Text="MASSIVE 95";BackColor=Color.Black;
        if(run||preview){FormBorderStyle=FormBorderStyle.None;ShowInTaskbar=false;StartPosition=FormStartPosition.Manual;Bounds=bounds;TopMost=run;}
        else {ClientSize=new Size(1100,790);StartPosition=FormStartPosition.CenterScreen;MinimumSize=new Size(640,500);}
        Controls.Add(web);Shown+=async (_,_)=>await StartWeb();
        inputTimer.Tick+=(_,_)=>CheckInput();
    }
    protected override void OnHandleCreated(EventArgs e) {
        base.OnHandleCreated(e);
        if(preview){Native.SetWindowLongPtr(Handle,-16,(nint)0x50000000);Native.SetParent(Handle,parent);Native.GetClientRect(parent,out var r);Bounds=new Rectangle(0,0,r.Right,r.Bottom);}
    }
    async Task StartWeb() {
        try {
            var env=await CoreWebView2Environment.CreateAsync(null,Path.Combine(Program.UserRoot,"BrowserData"),new CoreWebView2EnvironmentOptions("--autoplay-policy=no-user-gesture-required"));
            await web.EnsureCoreWebView2Async(env);
            var core=web.CoreWebView2;core.Settings.AreDevToolsEnabled=false;core.Settings.AreDefaultContextMenusEnabled=false;core.Settings.IsStatusBarEnabled=false;
            core.SetVirtualHostNameToFolderMapping("massive95.example",Path.Combine(AppContext.BaseDirectory,"wwwroot"),CoreWebView2HostResourceAccessKind.DenyCors);
            core.WebMessageReceived+=(_,e)=>{if(run&&e.TryGetWebMessageAsString()=="exit")exit();};
            core.NavigationStarting+=(_,e)=>{if(!e.Uri.StartsWith("https://massive95.example/",StringComparison.OrdinalIgnoreCase)){e.Cancel=true;if(!run&&!preview&&e.IsUserInitiated&&Uri.TryCreate(e.Uri,UriKind.Absolute,out var u)&&u.Scheme=="https")Process.Start(new ProcessStartInfo(e.Uri){UseShellExecute=true});}};
            core.NewWindowRequested+=(_,e)=>{e.Handled=true;if(!run&&!preview&&e.IsUserInitiated&&Uri.TryCreate(e.Uri,UriKind.Absolute,out var u)&&u.Scheme=="https")Process.Start(new ProcessStartInfo(e.Uri){UseShellExecute=true});};
            core.NavigationCompleted+=async (_,e)=>{
                if(!e.IsSuccess){File.WriteAllText(Path.Combine(Program.UserRoot,"last-error.txt"),e.WebErrorStatus.ToString());Environment.ExitCode=1;exit();return;}
                if(Program.Smoke){await core.ExecuteScriptAsync("saverApp.engine.paused=false");await Task.Delay(2500);string result=await core.ExecuteScriptAsync("JSON.stringify({presets:SAVERS.length,recordings:RECORDINGS.length,frames:saverApp.engine.frames,state:saverApp.getState()})");File.WriteAllText(Path.Combine(AppContext.BaseDirectory,"smoke-result.json"),result);exit();}
            };
            core.Navigate("https://massive95.example/index.html"+(run?"?run=1":preview?"?nativepreview=1":""));
            if(run){startMouse=Cursor.Position;initialInput=Native.LastInput();Cursor.Hide();inputTimer.Start();}
        }catch(Exception ex){File.WriteAllText(Path.Combine(Program.UserRoot,"last-error.txt"),ex.ToString());Environment.ExitCode=1;if(!run&&!preview&&!Program.Smoke)MessageBox.Show(ex.Message,"MASSIVE 95");exit();}
    }
    void CheckInput(){if(lifetime.ElapsedMilliseconds<1800){startMouse=Cursor.Position;initialInput=Native.LastInput();return;}var p=Cursor.Position;if(Math.Abs(p.X-startMouse.X)>8||Math.Abs(p.Y-startMouse.Y)>8||Native.LastInput()!=initialInput)exit();}
    protected override void Dispose(bool disposing){if(disposing){inputTimer.Dispose();web.Dispose();if(run)Cursor.Show();}base.Dispose(disposing);}
}
internal static class Native {
    [StructLayout(LayoutKind.Sequential)] internal struct Rect{public int Left,Top,Right,Bottom;}
    [StructLayout(LayoutKind.Sequential)] struct LastInputInfo{public uint cbSize,dwTime;}
    [DllImport("user32.dll")] internal static extern nint SetParent(nint child,nint parent);
    [DllImport("user32.dll",EntryPoint="SetWindowLongPtrW")] internal static extern nint SetWindowLongPtr(nint window,int index,nint value);
    [DllImport("user32.dll")] internal static extern bool GetClientRect(nint window,out Rect rect);
    [DllImport("user32.dll")] static extern bool GetLastInputInfo(ref LastInputInfo info);
    internal static uint LastInput(){var info=new LastInputInfo{cbSize=(uint)Marshal.SizeOf<LastInputInfo>()};GetLastInputInfo(ref info);return info.dwTime;}
}
