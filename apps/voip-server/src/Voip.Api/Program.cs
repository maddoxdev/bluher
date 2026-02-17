using Voip.Api.Hubs;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSignalR();

var app = builder.Build();

app.UseStaticFiles();

app.MapGet("/", () => Results.Redirect("/test-call"));

app.MapGet("/test-call", (IWebHostEnvironment env) =>
{
    var filePath = Path.Combine(env.WebRootPath, "test-call", "index.html");
    return File.Exists(filePath)
        ? Results.File(filePath, "text/html; charset=utf-8")
        : Results.NotFound("test-call page was not found.");
});

app.MapGet("/test-call/index.html", (IWebHostEnvironment env) =>
{
    var filePath = Path.Combine(env.WebRootPath, "test-call", "index.html");
    return File.Exists(filePath)
        ? Results.File(filePath, "text/html; charset=utf-8")
        : Results.NotFound("test-call page was not found.");
});

app.MapGet("/test-call/health", () => Results.Ok(new { status = "ok" }));

app.MapControllers();
app.MapHub<SignalingHub>("/hubs/signaling");

app.Run();
