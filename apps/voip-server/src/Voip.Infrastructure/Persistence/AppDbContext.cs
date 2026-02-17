using Microsoft.EntityFrameworkCore;
using Voip.Domain.Entities;

namespace Voip.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
}
