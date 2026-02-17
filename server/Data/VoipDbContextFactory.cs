using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace VoipServer.Data;

public class VoipDbContextFactory : IDesignTimeDbContextFactory<VoipDbContext>
{
    public VoipDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<VoipDbContext>();
        optionsBuilder.UseNpgsql("Host=localhost;Database=voipdb;Username=postgres;Password=postgres");

        return new VoipDbContext(optionsBuilder.Options);
    }
}
