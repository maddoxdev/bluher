using Microsoft.EntityFrameworkCore;
using VoipServer.Models;

namespace VoipServer.Data;

public class VoipDbContext : DbContext
{
    public VoipDbContext(DbContextOptions<VoipDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Call> Calls { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Username).IsUnique();
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Username).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(100);
            entity.Property(e => e.PasswordHash).IsRequired();
        });

        modelBuilder.Entity<Call>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Caller)
                .WithMany()
                .HasForeignKey(e => e.CallerId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Callee)
                .WithMany()
                .HasForeignKey(e => e.CalleeId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
