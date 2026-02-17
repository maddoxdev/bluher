# Security Considerations

This document outlines important security considerations for deploying the VoIP application in production.

## Critical Security Items

### 1. Password Hashing

**Current Implementation**: SHA-256 (for development only)
**Production Requirement**: Use BCrypt, Argon2, or PBKDF2

The current implementation uses SHA-256 for password hashing, which is **not suitable for production**. SHA-256 is too fast and vulnerable to brute-force attacks.

**Recommended Implementation**:

```bash
# Install BCrypt.Net-Next
cd server
dotnet add package BCrypt.Net-Next
```

Update `AuthService.cs`:

```csharp
private static string HashPassword(string password)
{
    return BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
}

private static bool VerifyPassword(string password, string hash)
{
    return BCrypt.Net.BCrypt.Verify(password, hash);
}
```

### 2. JWT Secret Key Management

**Current Implementation**: Hardcoded in configuration files
**Production Requirement**: Environment variables or secret management systems

Never commit JWT secret keys to source control. Use one of these approaches:

**Option A: Environment Variables**
```bash
export Jwt__Key="your-production-secret-key-min-64-characters"
```

**Option B: Kubernetes Secrets**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: voip-secrets
  namespace: voip
type: Opaque
stringData:
  jwt-key: "your-production-secret-key-min-64-characters"
```

**Option C: Azure Key Vault**
```csharp
builder.Configuration.AddAzureKeyVault(
    new Uri($"https://{keyVaultName}.vault.azure.net/"),
    new DefaultAzureCredential());
```

### 3. Database Credentials

**Current Implementation**: Hardcoded in Kubernetes manifests
**Production Requirement**: Use Kubernetes Secrets

Create a secret for database credentials:

```bash
kubectl create secret generic postgres-credentials \
  --from-literal=username=postgres \
  --from-literal=password=your-secure-password \
  -n voip
```

Update deployments to reference the secret:

```yaml
env:
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: postgres-credentials
      key: password
```

### 4. Redis Connection Security

For production Redis deployments:

1. Enable authentication with a strong password
2. Use TLS/SSL for connections
3. Use ACLs to restrict access
4. Consider Redis Sentinel or Redis Cluster for HA

```bash
# Example Redis connection with password
ConnectionStrings__Redis="redis-server:6379,password=your-redis-password,ssl=true"
```

### 5. HTTPS/TLS

**Production Requirement**: Always use HTTPS/WSS

- Configure SSL certificates for the server
- Use cert-manager in Kubernetes for automatic certificate management
- Ensure all WebSocket connections use WSS (not WS)

**Kubernetes Ingress with cert-manager**:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: voip-ingress
  namespace: voip
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - voip.yourdomain.com
    secretName: voip-tls
  rules:
  - host: voip.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: voip-server
            port:
              number: 5000
```

### 6. TURN Server Security

For coturn in production:

1. Use authentication (static-auth-secret or long-term credentials)
2. Enable TLS/DTLS
3. Restrict allowed IP ranges
4. Use firewall rules to limit access

Update `coturn.conf`:

```conf
use-auth-secret
static-auth-secret=your-turn-secret
cert=/path/to/cert.pem
pkey=/path/to/key.pem
cipher-list="HIGH:!aNULL:!MD5:!RC4"
```

### 7. CORS Configuration

**Production Requirement**: Restrict allowed origins

Update `Program.cs` to only allow your production domains:

```csharp
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                "https://yourdomain.com",
                "https://app.yourdomain.com"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});
```

### 8. Rate Limiting

Implement rate limiting to prevent abuse:

```bash
dotnet add package AspNetCoreRateLimit
```

### 9. Input Validation

- Validate all user inputs
- Sanitize data before database operations
- Use parameterized queries (already done with EF Core)

### 10. Logging and Monitoring

- Never log sensitive data (passwords, tokens)
- Implement proper logging for security events
- Set up monitoring and alerting
- Use Application Insights or similar services

## Security Checklist for Production

- [ ] Replace SHA-256 with BCrypt/Argon2 for password hashing
- [ ] Move JWT keys to environment variables or Key Vault
- [ ] Use Kubernetes Secrets for all sensitive data
- [ ] Enable HTTPS/WSS with valid certificates
- [ ] Configure TURN server with authentication and TLS
- [ ] Restrict CORS to production domains only
- [ ] Enable Redis authentication and SSL
- [ ] Implement rate limiting
- [ ] Set up security monitoring and logging
- [ ] Regular security audits and dependency updates
- [ ] Enable SQL injection protection (verify EF Core usage)
- [ ] Implement proper error handling (don't expose stack traces)
- [ ] Use security headers (HSTS, CSP, X-Frame-Options, etc.)
- [ ] Regular backup and disaster recovery plan

## Dependency Security

Regularly update dependencies:

```bash
# Check for vulnerabilities
cd server && dotnet list package --vulnerable
cd client && npm audit

# Update packages
dotnet outdated
npm update
```

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [ASP.NET Core Security](https://docs.microsoft.com/en-us/aspnet/core/security/)
- [WebRTC Security](https://webrtc-security.github.io/)
- [Kubernetes Secrets Management](https://kubernetes.io/docs/concepts/configuration/secret/)
