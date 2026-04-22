using Microsoft.AspNetCore.SignalR;
using SignalRProjectTutorial.Hubs;
using SignalRProjectTutorial.Infrastructure;
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorPages();
builder.Services.AddSignalR();

// Provide a simple IUserIdProvider that reads ?user= from the connection URL.
// This enables Clients.User(userId) without full ASP.NET authentication.
builder.Services.AddSingleton<IUserIdProvider, QueryStringUserIdProvider>();

// Allow Angular dev server (default: http://localhost:4200) to connect during development.
// Adjust the origin(s) to match your Angular host(s) in production.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularDevClient", policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseCors("AllowAngularDevClient");

app.UseAuthorization();

app.MapRazorPages();
app.MapHub<ChatHub>("/chatHub");

app.Run();