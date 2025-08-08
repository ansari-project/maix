# CI/CD Testing Strategy

## Overview

Our CI/CD pipeline runs both unit and integration tests using GitHub Actions with a PostgreSQL service container.

## Test Environments

### Local Development
- PostgreSQL running locally or via Docker
- Database: `maix_test`
- Fast iteration and debugging

### CI/CD (GitHub Actions)
- PostgreSQL service container (postgres:15-alpine)
- Ephemeral database per run
- Isolated and reproducible

### Production-like Testing (Optional)
- Neon test database
- Exact production parity
- For release candidates only

## Current Setup

### GitHub Actions Workflow
```yaml
services:
  postgres:
    image: postgres:15-alpine
    env:
      POSTGRES_DB: maix_test
```

**Why this approach?**
1. **Free**: No additional costs
2. **Fast**: Local to runner (~5-10 seconds for all tests)
3. **Isolated**: Fresh database per run
4. **Reliable**: No network issues
5. **Sufficient**: PostgreSQL 15 matches Neon's version

## Migration Path to Neon (If Needed)

### When to Consider Neon for CI/CD:
- Testing Neon-specific features (branching, autoscaling)
- Debugging production-only issues
- Load testing with production-like latency
- Compliance requirements

### How to Add Neon:
1. Create dedicated test database in Neon
2. Add `NEON_TEST_DATABASE_URL` to GitHub Secrets
3. Uncomment `neon-integration-tests` job in workflow
4. Run only on main branch to control costs

### Cost Considerations:
- Neon Free Tier: 0.5 GB storage, perfect for test DB
- Each CI run: ~5-10 MB of test data
- Estimate: Free tier covers 50-100 CI runs/day

## Best Practices

### 1. Database Isolation
```typescript
beforeEach(async () => {
  await cleanupTestDatabase()  // Start fresh
})
```

### 2. Deterministic Tests
- Use fixed dates/times
- Consistent test data
- No random values

### 3. Parallel Safety
- Each test suite gets fresh schema
- No shared state between tests
- Transaction isolation

### 4. Performance Monitoring
```yaml
- name: Time integration tests
  run: |
    START=$(date +%s)
    npm run test:integration
    END=$(date +%s)
    echo "Tests took $((END-START)) seconds"
```

## Troubleshooting

### Common Issues:

**1. Connection Timeout**
```typescript
// Increase timeout in db-test-utils.ts
await waitForDatabase(maxAttempts = 20)  // 20 seconds
```

**2. Migration Failures**
```bash
# Check migration status
npx prisma migrate status

# Reset if needed
npx prisma migrate reset --skip-seed
```

**3. Slow Tests**
- Check for N+1 queries
- Use `beforeAll` for expensive setup
- Consider test parallelization

### Debugging CI Failures:

1. **Add debug logging**:
```yaml
- name: Debug database
  run: |
    psql $DATABASE_URL -c "\dt"
    psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"User\""
```

2. **SSH into runner** (for debugging):
```yaml
- name: Setup tmate session
  uses: mxschmitt/action-tmate@v3
  if: ${{ failure() }}
```

## Performance Benchmarks

| Environment | Setup Time | Per Test | 42 Tests Total |
|------------|------------|----------|----------------|
| Local PostgreSQL | 1s | 50ms | 3s |
| GitHub Actions | 2s | 75ms | 5s |
| Neon (if used) | 3s | 150ms | 9s |

## Decision Matrix

| Factor | GitHub PostgreSQL | Neon Test DB |
|--------|------------------|--------------|
| Cost | ✅ Free | ⚠️ Free tier limits |
| Speed | ✅ Fast (local) | ⚠️ Slower (network) |
| Parity | ⚠️ Close enough | ✅ Exact match |
| Setup | ✅ Simple | ⚠️ More complex |
| Isolation | ✅ Perfect | ⚠️ Needs cleanup |

## Recommendation

**Current: PostgreSQL Service Container** ✅
- Sufficient for 99% of testing needs
- Zero cost, maximum speed
- PostgreSQL 15 = Neon compatibility

**Future: Add Neon for Release Testing**
- Run before major releases
- Catch Neon-specific edge cases
- Validate production behavior

## Commands

```bash
# Run integration tests locally
npm run test:integration

# Run with specific database
DATABASE_URL=postgresql://... npm run test:integration

# Run in CI mode (no watch)
CI=true npm run test:integration

# Debug test database
psql $DATABASE_URL -c "\dt"
```

## Next Steps

1. ✅ GitHub Actions with PostgreSQL (implemented)
2. ⏳ Monitor test performance
3. ⏳ Add Neon testing if issues arise
4. ⏳ Consider test parallelization for speed

The current setup provides excellent test coverage without additional costs or complexity. Neon-specific testing can be added later if production issues require it.