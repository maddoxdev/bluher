using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using VoipServer.Data;
using VoipServer.Models;

namespace VoipServer.Services;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
    Task<LoginResponse?> RegisterAsync(RegisterRequest request);
    Task<bool> UpdateDeviceTokenAsync(int userId, UpdateDeviceTokenRequest request);
}

public class AuthService : IAuthService
{
    private readonly VoipDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthService(VoipDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
        if (user == null || !VerifyPassword(request.Password, user.PasswordHash))
        {
            return null;
        }

        var token = GenerateJwtToken(user);
        return new LoginResponse
        {
            Token = token,
            UserId = user.Id,
            Username = user.Username
        };
    }

    public async Task<LoginResponse?> RegisterAsync(RegisterRequest request)
    {
        if (await _context.Users.AnyAsync(u => u.Username == request.Username || u.Email == request.Email))
        {
            return null;
        }

        var user = new User
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = HashPassword(request.Password),
            CreatedAt = DateTime.UtcNow,
            IsOnline = false
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var token = GenerateJwtToken(user);
        return new LoginResponse
        {
            Token = token,
            UserId = user.Id,
            Username = user.Username
        };
    }

    public async Task<bool> UpdateDeviceTokenAsync(int userId, UpdateDeviceTokenRequest request)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        if (request.FirebaseToken != null)
            user.FirebaseToken = request.FirebaseToken;
        if (request.ApnsToken != null)
            user.ApnsToken = request.ApnsToken;

        await _context.SaveChangesAsync();
        return true;
    }

    private string GenerateJwtToken(User user)
    {
        var jwtKey = _configuration["Jwt:Key"] ?? "VoipServer-Secret-Key-Min-32-Characters-Required";
        var jwtIssuer = _configuration["Jwt:Issuer"] ?? "VoipServer";
        var jwtAudience = _configuration["Jwt:Audience"] ?? "VoipClient";

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // WARNING: SHA-256 is used here for simplicity but is NOT suitable for production!
    // For production, use BCrypt, Argon2, or PBKDF2 which include salting and configurable work factors
    // Example with BCrypt.Net-Next:
    // Install: dotnet add package BCrypt.Net-Next
    // Hash: BCrypt.Net.BCrypt.HashPassword(password)
    // Verify: BCrypt.Net.BCrypt.Verify(password, hash)
    private static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(bytes);
    }

    private static bool VerifyPassword(string password, string hash)
    {
        var computedHash = HashPassword(password);
        return computedHash == hash;
    }
}
