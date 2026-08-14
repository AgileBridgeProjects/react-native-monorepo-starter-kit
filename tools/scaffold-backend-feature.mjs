#!/usr/bin/env node
/**
 * scaffold-backend-feature.mjs
 *
 * Generates the full clean-architecture stack for a new StarterKit backend domain entity.
 * Every generated file embeds correct namespaces, using statements, and interface stubs
 * so the AI only needs to fill in business logic.
 *
 * Usage:
 *   node tools/scaffold-backend-feature.mjs --module Rewards --entity Reward
 *   node tools/scaffold-backend-feature.mjs --module Foo --entity Bar --api web --tenant
 *
 * Options:
 *   --module <Name>     PascalCase module name  (e.g. Rewards, Games, Topics)
 *   --entity <Name>     PascalCase entity name  (e.g. Reward, Game, Topic)
 *   --api <mobile|web|both>  Which API project to scaffold (default: mobile)
 *   --tenant            Add ClubId + [AllowImpersonation] for tenant-scoped entities
 *   --dry-run           Print paths without writing files
 */

import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Argument Parsing ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return null;
  return args[i + 1] ?? true;
}

const module_ = flag('module');
const entity  = flag('entity');
const api     = flag('api') || 'mobile';
const tenant  = args.includes('--tenant');
const dryRun  = args.includes('--dry-run');

if (!module_ || !entity || module_ === true || entity === true) {
  console.error('Usage: node tools/scaffold-backend-feature.mjs --module <Module> --entity <Entity> [--api mobile|web|both] [--tenant] [--dry-run]');
  process.exit(1);
}

const entities  = `${entity}s`;   // naive pluralisation
const entityVar = entity[0].toLowerCase() + entity.slice(1);
const root      = join(fileURLToPath(import.meta.url), '../../apps/backend');

const apis = api === 'both' ? ['MobileApi', 'WebApi'] : api === 'web' ? ['WebApi'] : ['MobileApi'];

// ─── File Registry ────────────────────────────────────────────────────────────

const files = [];

function add(path, content) {
  files.push({ path: join(root, path), content });
}

// ─── StarterKit.Data / Entity Model ───────────────────────────────────────────────

add(`src/StarterKit.Data/${module_}/Models/${entity}.cs`, `using StarterKit.Data.Auditing;

namespace StarterKit.Data.${module_}.Models;

public class ${entity} : IAuditable, ISoftDeletable, IConcurrent
{
    public Guid Id { get; set; }
${tenant ? `    public Guid ClubId { get; set; }\n` : ''}
    // TODO: add domain properties here

    // IAuditable
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // ISoftDeletable
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }

    // IConcurrent is a marker interface — the concurrency token is PostgreSQL's xmin system
    // column, applied globally via UseXminAsConcurrencyToken(). No property belongs here.
}
`);

// ─── StarterKit.Data / EF Configuration ──────────────────────────────────────────

add(`src/StarterKit.Data/${module_}/Configurations/${entity}Configuration.cs`, `using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StarterKit.Data.${module_}.Models;

namespace StarterKit.Data.${module_}.Configurations;

public sealed class ${entity}Configuration : IEntityTypeConfiguration<${entity}>
{
    public void Configure(EntityTypeBuilder<${entity}> builder)
    {
        builder.ToTable("${entities}");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasDefaultValueSql("gen_random_uuid()");
${tenant ? `        builder.Property(x => x.ClubId).IsRequired();\n` : ''}        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.IsDeleted).IsRequired().HasDefaultValue(false);

        // No RowVersion mapping: IConcurrent's token is the xmin system column, configured
        // globally in AppDbContext.ApplyConcurrencyTokens via UseXminAsConcurrencyToken().

        // TODO: configure properties, indexes, and relationships
    }
}
`);

// ─── StarterKit.Data / Repository Interface ──────────────────────────────────────

add(`src/StarterKit.Data/${module_}/Interfaces/Repositories/I${entity}Repository.cs`, `using StarterKit.Data.${module_}.Models;

namespace StarterKit.Data.${module_}.Interfaces.Repositories;

public interface I${entity}Repository
{
    Task AddAsync(${entity} ${entityVar}, CancellationToken cancellationToken = default);
    Task<${entity}?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<${entity}> GetAsync(Guid id, CancellationToken cancellationToken = default);
    Task UpdateAsync(${entity} ${entityVar}, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<${entity}> Items, int TotalCount)> ListAsync(
        int page,
        int pageSize,
        string? filterText = null,
        string? sortBy = null,
        bool sortDescending = false,
        CancellationToken cancellationToken = default
    );
}
`);

// ─── StarterKit.Data / Repository Implementation ─────────────────────────────────

add(`src/StarterKit.Data/${module_}/Repositories/${entity}Repository.cs`, `using Microsoft.EntityFrameworkCore;
using StarterKit.Data.${module_}.Interfaces.Repositories;
using StarterKit.Data.${module_}.Models;
using StarterKit.Data.Extensions;
using StarterKit.Data.Persistence;

namespace StarterKit.Data.${module_}.Repositories;

public sealed class ${entity}Repository(AppDbContext db) : I${entity}Repository
{
    public async Task AddAsync(${entity} ${entityVar}, CancellationToken cancellationToken = default)
    {
        await db.${entities}.AddAsync(${entityVar}, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
    }

    public Task<${entity}?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        db.${entities}.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public Task<${entity}> GetAsync(Guid id, CancellationToken cancellationToken = default) =>
        db.${entities}.GetAsync(id, cancellationToken);

    public async Task UpdateAsync(${entity} ${entityVar}, CancellationToken cancellationToken = default)
    {
        db.${entities}.Update(${entityVar});
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var entity = await db.${entities}.GetAsync(id, cancellationToken);
        db.${entities}.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<(IReadOnlyList<${entity}> Items, int TotalCount)> ListAsync(
        int page,
        int pageSize,
        string? filterText = null,
        string? sortBy = null,
        bool sortDescending = false,
        CancellationToken cancellationToken = default
    )
    {
        // TODO: add the text filter once this entity has a field to filter on, e.g.
        //   .WhereIf(!string.IsNullOrWhiteSpace(filterText), x => x.Name.Contains(filterText!))
        // Use WhereIf rather than an if-chain (docs/standards/backend/repositories.md), and a
        // translatable predicate — Guid.ToString() inside a query does not translate on Npgsql.
        var query = db.${entities}
            .AsNoTracking()
            .ApplySorting(sortBy, sortDescending, defaultSort: "Id");

        var total = await query.CountAsync(cancellationToken);
        var items = await query.ApplyPaging(page, pageSize).ToListAsync(cancellationToken);
        return (items, total);
    }
}
`);

// ─── StarterKit.Core / DTOs ───────────────────────────────────────────────────────

add(`src/StarterKit.Core/${module_}/DTOs/${entity}Dto.cs`, `namespace StarterKit.Core.${module_}.DTOs;

public sealed record ${entity}Dto
{
    public required Guid Id { get; init; }
    // TODO: add mapped properties from the entity
}
`);

add(`src/StarterKit.Core/${module_}/DTOs/Create${entity}Dto.cs`, `namespace StarterKit.Core.${module_}.DTOs;

public sealed record Create${entity}Dto
{
    // TODO: add required fields for entity creation
}
`);

add(`src/StarterKit.Core/${module_}/DTOs/Update${entity}Dto.cs`, `namespace StarterKit.Core.${module_}.DTOs;

public sealed record Update${entity}Dto
{
    // TODO: add updatable fields
}
`);

add(`src/StarterKit.Core/${module_}/DTOs/${entity}ListQuery.cs`, `using StarterKit.Core.Common;

namespace StarterKit.Core.${module_}.DTOs;

// A class, not a record: PagedAndFilteredQuery is an abstract class, and a record cannot inherit
// from one (CS8864).
public sealed class ${entity}ListQuery : PagedAndFilteredQuery
{
    // TODO: add domain-specific filter properties
}
`);

// ─── StarterKit.Core / Service Interface ─────────────────────────────────────────

add(`src/StarterKit.Core/${module_}/Interfaces/Services/I${entity}Service.cs`, `using StarterKit.Core.${module_}.DTOs;
using StarterKit.Core.Common;

namespace StarterKit.Core.${module_}.Interfaces.Services;

public interface I${entity}Service
{
    Task<${entity}Dto> CreateAsync(Create${entity}Dto dto, CancellationToken cancellationToken = default);
    Task<${entity}Dto?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<${entity}Dto> UpdateAsync(Guid id, Update${entity}Dto dto, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<PagedResult<${entity}Dto>> ListAsync(${entity}ListQuery query, CancellationToken cancellationToken = default);
}
`);

// ─── StarterKit.Core / Service Implementation ─────────────────────────────────────

add(`src/StarterKit.Core/${module_}/Services/${entity}Service.cs`, `using StarterKit.Core.${module_}.DTOs;
using StarterKit.Core.${module_}.Interfaces.Services;
using StarterKit.Core.Common;
using StarterKit.Data.${module_}.Interfaces.Repositories;
using StarterKit.Data.${module_}.Models;

namespace StarterKit.Core.${module_}.Services;

public sealed class ${entity}Service(I${entity}Repository ${entityVar}Repository) : I${entity}Service
{
    public async Task<${entity}Dto> CreateAsync(Create${entity}Dto dto, CancellationToken cancellationToken = default)
    {
        var ${entityVar} = new ${entity}
        {
            // TODO: map dto properties
        };

        await ${entityVar}Repository.AddAsync(${entityVar}, cancellationToken);
        return ToDto(${entityVar});
    }

    public async Task<${entity}Dto?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var ${entityVar} = await ${entityVar}Repository.FindByIdAsync(id, cancellationToken);
        return ${entityVar} is null ? null : ToDto(${entityVar});
    }

    public async Task<${entity}Dto> UpdateAsync(Guid id, Update${entity}Dto dto, CancellationToken cancellationToken = default)
    {
        var ${entityVar} = await ${entityVar}Repository.GetAsync(id, cancellationToken);
        // TODO: apply dto fields to entity
        await ${entityVar}Repository.UpdateAsync(${entityVar}, cancellationToken);
        return ToDto(${entityVar});
    }

    public Task DeleteAsync(Guid id, CancellationToken cancellationToken = default) =>
        ${entityVar}Repository.DeleteAsync(id, cancellationToken);

    public async Task<PagedResult<${entity}Dto>> ListAsync(${entity}ListQuery query, CancellationToken cancellationToken = default)
    {
        var (items, total) = await ${entityVar}Repository.ListAsync(
            query.ClampedPage,
            query.ClampedPageSize,
            query.FilterText,
            query.SortBy,
            query.SortDescending,
            cancellationToken
        );

        return new PagedResult<${entity}Dto>
        {
            Items     = items.Select(ToDto).ToList(),
            TotalCount = total,
            Page      = query.ClampedPage,
            PageSize  = query.ClampedPageSize,
        };
    }

    private static ${entity}Dto ToDto(${entity} ${entityVar}) => new()
    {
        Id = ${entityVar}.Id,
        // TODO: map remaining properties
    };
}
`);

// ─── API Projects ─────────────────────────────────────────────────────────────

for (const apiProject of apis) {
  const tenantAttr = tenant ? '\n[AllowImpersonation]' : '';

  // Controller interface
  add(`src/StarterKit.${apiProject}/${module_}/Interfaces/I${entities}Controller.cs`, `using StarterKit.${apiProject}.${module_}.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace StarterKit.${apiProject}.${module_}.Interfaces;

/// <summary>HTTP contract for <c>${entities}Controller</c>.</summary>
public interface I${entities}Controller
{
    Task<ActionResult<${entity}Response>> CreateAsync(Create${entity}Request request, CancellationToken cancellationToken);
    Task<ActionResult<${entity}Response>> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<ActionResult<${entity}Response>> UpdateAsync(Guid id, Update${entity}Request request, CancellationToken cancellationToken);
    Task<ActionResult> DeleteAsync(Guid id, CancellationToken cancellationToken);
    Task<ActionResult<${entity}ListResponse>> ListAsync([FromQuery] ${entity}ListRequest request, CancellationToken cancellationToken);
}
`);

  // Request DTOs
  add(`src/StarterKit.${apiProject}/${module_}/DTOs/Create${entity}Request.cs`, `namespace StarterKit.${apiProject}.${module_}.DTOs;

public sealed record Create${entity}Request
{
    // TODO: add required HTTP request fields
}
`);

  add(`src/StarterKit.${apiProject}/${module_}/DTOs/Update${entity}Request.cs`, `namespace StarterKit.${apiProject}.${module_}.DTOs;

public sealed record Update${entity}Request
{
    // TODO: add updatable HTTP request fields
}
`);

  add(`src/StarterKit.${apiProject}/${module_}/DTOs/${entity}Response.cs`, `namespace StarterKit.${apiProject}.${module_}.DTOs;

public sealed record ${entity}Response
{
    public required Guid Id { get; init; }
    // TODO: map from ${entity}Dto
}
`);

  add(`src/StarterKit.${apiProject}/${module_}/DTOs/${entity}ListRequest.cs`, `using StarterKit.Core.Common;

namespace StarterKit.${apiProject}.${module_}.DTOs;

public sealed record ${entity}ListRequest
{
    public int Page { get; init; } = PagingConstants.DefaultPage;
    public int PageSize { get; init; } = PagingConstants.DefaultPageSize;
    public string? FilterText { get; init; }
    public string? SortBy { get; init; }
    public bool SortDescending { get; init; }
}
`);

  // Paged list response. WebApi has a shared PagedResponse<T> base; MobileApi does not, so it
  // declares the same five fields itself (the CheckInHistoryResponse pattern).
  add(`src/StarterKit.${apiProject}/${module_}/DTOs/${entity}ListResponse.cs`, apiProject === 'WebApi'
    ? `using StarterKit.WebApi.Common;

namespace StarterKit.WebApi.${module_}.DTOs;

public sealed class ${entity}ListResponse : PagedResponse<${entity}Response>;
`
    : `namespace StarterKit.MobileApi.${module_}.DTOs;

public sealed class ${entity}ListResponse
{
    public IReadOnlyList<${entity}Response> Items { get; init; } = [];
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
    public bool HasNextPage { get; init; }
}
`);

  // Controller
  add(`src/StarterKit.${apiProject}/${module_}/${entities}Controller.cs`, `using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;${tenant ? `\nusing StarterKit.Auth.Attributes;` : ''}
using StarterKit.Core.${module_}.DTOs;
using StarterKit.Core.${module_}.Interfaces.Services;
using StarterKit.${apiProject}.${module_}.DTOs;
using StarterKit.${apiProject}.${module_}.Interfaces;
using StarterKit.${apiProject}.${module_}.Mappers;

namespace StarterKit.${apiProject}.${module_};

[ApiController]
[Route("api/${module_.toLowerCase()}")]
[Tags("${module_}")]
[Authorize]${tenantAttr}
public sealed class ${entities}Controller(I${entity}Service ${entityVar}Service)
    : ControllerBase, I${entities}Controller
{
    [HttpPost]
    [ProducesResponseType(typeof(${entity}Response), StatusCodes.Status201Created)]
    public async Task<ActionResult<${entity}Response>> CreateAsync(
        Create${entity}Request request,
        CancellationToken cancellationToken
    )
    {
        var dto = await ${entityVar}Service.CreateAsync(request.ToDto(), cancellationToken);
        return Created($"/api/${module_.toLowerCase()}/{dto.Id}", dto.ToResponse());
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(${entity}Response), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<${entity}Response>> GetAsync(
        Guid id,
        CancellationToken cancellationToken
    )
    {
        var dto = await ${entityVar}Service.FindByIdAsync(id, cancellationToken);
        if (dto is null) return NotFound();
        return Ok(dto.ToResponse());
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(${entity}Response), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<${entity}Response>> UpdateAsync(
        Guid id,
        Update${entity}Request request,
        CancellationToken cancellationToken
    )
    {
        var dto = await ${entityVar}Service.UpdateAsync(id, request.ToDto(), cancellationToken);
        return Ok(dto.ToResponse());
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken
    )
    {
        await ${entityVar}Service.DeleteAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpGet]
    [ProducesResponseType(typeof(${entity}ListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<${entity}ListResponse>> ListAsync(
        [FromQuery] ${entity}ListRequest request,
        CancellationToken cancellationToken
    )
    {
        var result = await ${entityVar}Service.ListAsync(request.ToQuery(), cancellationToken);
        return Ok(
            new ${entity}ListResponse
            {
                Items = result.Items.Select(dto => dto.ToResponse()).ToList(),
                TotalCount = result.TotalCount,
                Page = result.Page,
                PageSize = result.PageSize,
                HasNextPage = result.HasNextPage,
            }
        );
    }
}
`);

  // MCP tools — 1:1 with the controller's actions (docs/standards/backend/mcp.md)
  const toolPrefix = module_.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  add(`src/StarterKit.${apiProject}/${module_}/Mcp/${entities}McpTools.cs`, `using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Server;
using StarterKit.Core.${module_}.Interfaces.Services;
using StarterKit.${apiProject}.${module_}.DTOs;
using StarterKit.${apiProject}.${module_}.Mappers;

namespace StarterKit.${apiProject}.${module_}.Mcp;

/// <summary>MCP tools mirroring <see cref="${entities}Controller"/> 1:1.</summary>
[McpServerToolType]
public sealed class ${entities}McpTools(I${entity}Service ${entityVar}Service)
{
    [McpServerTool(Name = "${toolPrefix}_create")]
    [Authorize] // TODO: match the controller action's policy exactly
    [Description("Creates a new ${entityVar}.")]
    public async Task<${entity}Response> CreateAsync(
        Create${entity}Request request,
        CancellationToken cancellationToken
    )
    {
        var dto = await ${entityVar}Service.CreateAsync(request.ToDto(), cancellationToken);
        return dto.ToResponse();
    }

    [McpServerTool(Name = "${toolPrefix}_get", ReadOnly = true)]
    [Authorize] // TODO: match the controller action's policy exactly
    [Description("Gets a ${entityVar} by id.")]
    public async Task<${entity}Response?> GetAsync(
        [Description("The ${entityVar} id.")] Guid id,
        CancellationToken cancellationToken
    )
    {
        var dto = await ${entityVar}Service.FindByIdAsync(id, cancellationToken);
        return dto?.ToResponse();
    }

    [McpServerTool(Name = "${toolPrefix}_update", Idempotent = true)]
    [Authorize] // TODO: match the controller action's policy exactly
    [Description("Updates an existing ${entityVar}.")]
    public async Task<${entity}Response> UpdateAsync(
        [Description("The ${entityVar} id.")] Guid id,
        Update${entity}Request request,
        CancellationToken cancellationToken
    )
    {
        var dto = await ${entityVar}Service.UpdateAsync(id, request.ToDto(), cancellationToken);
        return dto.ToResponse();
    }

    [McpServerTool(Name = "${toolPrefix}_delete", Destructive = true)]
    [Authorize] // TODO: match the controller action's policy exactly
    [Description("Deletes a ${entityVar}.")]
    public async Task DeleteAsync(
        [Description("The ${entityVar} id.")] Guid id,
        CancellationToken cancellationToken
    )
    {
        await ${entityVar}Service.DeleteAsync(id, cancellationToken);
    }

    [McpServerTool(Name = "${toolPrefix}_list", ReadOnly = true)]
    [Authorize] // TODO: match the controller action's policy exactly
    [Description("Lists ${entityVar}s (paged, filterable, sortable).")]
    public async Task<${entity}ListResponse> ListAsync(
        ${entity}ListRequest request,
        CancellationToken cancellationToken
    )
    {
        var result = await ${entityVar}Service.ListAsync(request.ToQuery(), cancellationToken);
        return new ${entity}ListResponse
        {
            Items = result.Items.Select(dto => dto.ToResponse()).ToList(),
            TotalCount = result.TotalCount,
            Page = result.Page,
            PageSize = result.PageSize,
            HasNextPage = result.HasNextPage,
        };
    }
}
`);

  // Mapper stub
  add(`src/StarterKit.${apiProject}/${module_}/Mappers/${entity}Mapper.cs`, `using StarterKit.Core.${module_}.DTOs;
using StarterKit.${apiProject}.${module_}.DTOs;
using Riok.Mapperly.Abstractions;

namespace StarterKit.${apiProject}.${module_}.Mappers;

[Mapper]
public static partial class ${entity}Mapper
{
    public static partial ${entity}Response ToResponse(this ${entity}Dto dto);
    public static partial Create${entity}Dto ToDto(this Create${entity}Request request);
    public static partial Update${entity}Dto ToDto(this Update${entity}Request request);
    public static partial ${entity}ListQuery ToQuery(this ${entity}ListRequest request);
}
`);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// Core unit tests
add(`tests/StarterKit.Core.Tests/${module_}/Services/${entity}ServiceTests.cs`, `using Bogus;
using FluentAssertions;
using StarterKit.Core.${module_}.DTOs;
using StarterKit.Core.${module_}.Services;
using StarterKit.Data.${module_}.Interfaces.Repositories;
using StarterKit.Data.${module_}.Models;
using Moq;

namespace StarterKit.Core.Tests.${module_}.Services;

public abstract class ${entity}ServiceTests
{
    protected readonly Mock<I${entity}Repository> ${entityVar}RepoMock = new();
    protected readonly ${entity}Service Sut;
    protected static readonly Faker Faker = new();

    protected ${entity}ServiceTests()
    {
        Sut = new ${entity}Service(${entityVar}RepoMock.Object);
    }

    public sealed class CreateAsync_Tests : ${entity}ServiceTests
    {
        [Fact]
        public async Task CreateAsync_WithValidDto_ReturnsDto()
        {
            // Arrange
            var dto = new Create${entity}Dto
            {
                // TODO: populate required fields
            };

            ${entityVar}RepoMock
                .Setup(x => x.AddAsync(It.IsAny<${entity}>(), It.IsAny<CancellationToken>()))
                .Callback<${entity}, CancellationToken>((e, _) => e.Id = Guid.NewGuid())
                .Returns(Task.CompletedTask);

            // Act
            var result = await Sut.CreateAsync(dto);

            // Assert
            result.Id.Should().NotBeEmpty();
            ${entityVar}RepoMock.Verify(x => x.AddAsync(It.IsAny<${entity}>(), default), Times.Once);
        }
    }

    public sealed class FindByIdAsync_Tests : ${entity}ServiceTests
    {
        [Fact]
        public async Task FindByIdAsync_WhenExists_ReturnsDto()
        {
            var id = Guid.NewGuid();
            ${entityVar}RepoMock
                .Setup(x => x.FindByIdAsync(id, default))
                .ReturnsAsync(new ${entity} { Id = id });

            var result = await Sut.FindByIdAsync(id);

            result.Should().NotBeNull();
            result!.Id.Should().Be(id);
        }

        [Fact]
        public async Task FindByIdAsync_WhenNotFound_ReturnsNull()
        {
            ${entityVar}RepoMock
                .Setup(x => x.FindByIdAsync(It.IsAny<Guid>(), default))
                .ReturnsAsync((${entity}?)null);

            var result = await Sut.FindByIdAsync(Guid.NewGuid());

            result.Should().BeNull();
        }
    }
}
`);

// Data repository tests
add(`tests/StarterKit.Data.Tests/${module_}/Repositories/${entity}RepositoryTests.cs`, `using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using StarterKit.Data.${module_}.Models;
using StarterKit.Data.${module_}.Repositories;
using StarterKit.Data.Persistence;

namespace StarterKit.Data.Tests.${module_}.Repositories;

public sealed class ${entity}RepositoryTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly ${entity}Repository Sut;

    public ${entity}RepositoryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db  = new AppDbContext(options);
        Sut  = new ${entity}Repository(_db);
    }

    [Fact]
    public async Task AddAsync_ThenFindByIdAsync_ReturnsEntity()
    {
        var ${entityVar} = new ${entity} { Id = Guid.NewGuid() };

        await Sut.AddAsync(${entityVar});
        var found = await Sut.FindByIdAsync(${entityVar}.Id);

        found.Should().NotBeNull();
        found!.Id.Should().Be(${entityVar}.Id);
    }

    [Fact]
    public async Task GetAsync_WhenNotFound_Throws()
    {
        var act = async () => await Sut.GetAsync(Guid.NewGuid());

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task DeleteAsync_WhenExists_RemovesEntity()
    {
        var ${entityVar} = new ${entity} { Id = Guid.NewGuid() };
        await Sut.AddAsync(${entityVar});

        await Sut.DeleteAsync(${entityVar}.Id);
        var found = await Sut.FindByIdAsync(${entityVar}.Id);

        found.Should().BeNull();
    }

    public void Dispose() => _db.Dispose();
}
`);

// API integration tests (mobile only or both)
for (const apiProject of apis) {
  add(`tests/StarterKit.${apiProject}.Tests/${module_}/Controllers/${entities}ControllerTests.cs`, `using System.Net;
using Bogus;
using FluentAssertions;
using StarterKit.Core.${module_}.DTOs;
using StarterKit.Core.${module_}.Interfaces.Services;
using StarterKit.${apiProject}.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace StarterKit.${apiProject}.Tests.${module_}.Controllers;

public abstract class ${entities}ControllerTests : ${apiProject.replace('Api', 'Api')}IntegrationTestBase
{
    protected readonly Mock<I${entity}Service> ${entityVar}ServiceMock = new();

    protected ${entities}ControllerTests(WebApplicationFactory<Program> factory) : base(factory) { }

    protected System.Net.Http.HttpClient CreateClient() =>
        CreateClientWithAuth(services =>
        {
            services.AddScoped<I${entity}Service>(_ => ${entityVar}ServiceMock.Object);
        });

    public sealed class GetAsync_Tests : ${entities}ControllerTests, IClassFixture<WebApplicationFactory<Program>>
    {
        public GetAsync_Tests(WebApplicationFactory<Program> factory) : base(factory) { }

        [Fact]
        public async Task GetAsync_WhenExists_Returns200()
        {
            var id  = Guid.NewGuid();
            var dto = new ${entity}Dto { Id = id };

            ${entityVar}ServiceMock.Setup(x => x.FindByIdAsync(id, default)).ReturnsAsync(dto);

            var client   = CreateClient();
            var response = await client.GetAsync($"/api/${module_.toLowerCase()}/{id}");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }

        [Fact]
        public async Task GetAsync_WhenNotFound_Returns404()
        {
            ${entityVar}ServiceMock
                .Setup(x => x.FindByIdAsync(It.IsAny<Guid>(), default))
                .ReturnsAsync((${entity}Dto?)null);

            var client   = CreateClient();
            var response = await client.GetAsync($"/api/${module_.toLowerCase()}/{Guid.NewGuid()}");

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task GetAsync_WhenUnauthenticated_Returns401()
        {
            var client   = Factory.CreateClient();
            var response = await client.GetAsync($"/api/${module_.toLowerCase()}/{Guid.NewGuid()}");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
`);
}

// ─── Write Files ─────────────────────────────────────────────────────────────

let created = 0;
let skipped = 0;

for (const { path, content } of files) {
  if (dryRun) {
    console.log(`[dry-run] ${path}`);
    continue;
  }

  let exists = false;
  try {
    await stat(path);
    exists = true;
  } catch {
    exists = false;
  }

  if (exists) {
    console.warn(`[skip] already exists: ${path}`);
    skipped++;
    continue;
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf-8');
  console.log(`[create] ${path}`);
  created++;
}

if (!dryRun) {
  console.log(`\nDone. ${created} file(s) created, ${skipped} skipped.`);
  if (created > 0) {
    // Numbered at print time rather than hand-indexed — the old `tenant ? 5 : 4` arithmetic had to
    // be re-counted every time a step was added.
    const steps = [
      `Register the entity DbSet in AppDbContext: public DbSet<${entity}> ${entities} => Set<${entity}>();`,
      tenant
        ? `Add a HasQueryFilter for ${entity} in AppDbContext.ApplyMultitenancyFilters, combining the tenant and soft-delete predicates: (!_tenantContext.IsActive || e.ClubId == _tenantContext.ClubId) && !e.IsDeleted`
        : `Add a HasQueryFilter for ${entity} in AppDbContext.ApplySoftDeleteFilters: e => !e.IsDeleted`,
      'Add DI registrations in StarterKit.Data/Extensions/ServiceCollectionExtensions.cs',
      'Add DI registrations in StarterKit.Core/Extensions/ServiceCollectionExtensions.cs',
      `Run: dotnet ef migrations add Add${entity} --project src/StarterKit.Data --startup-project src/StarterKit.MobileApi --context AppDbContext`,
      'Fill in TODO comments in the generated files',
      'Update docs/erd.md with the new entity',
      "Align the MCP tools' [Authorize] policies with the controller and update the API's MCP parity test (docs/standards/backend/mcp.md)",
    ];
    if (tenant) {
      steps.push(`Add a two-tenant isolation test for ${entity} in StarterKit.Data.Tests/Multitenancy/MultitenancyIsolationTests.cs`);
    }

    console.log('\nNext steps:');
    steps.forEach((step, index) => console.log(`  ${index + 1}. ${step}`));
  }
}
