using System.Net;
using System.Text;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using Moq;
using StarterKit.Core.Auditing.Interfaces.Services;
using StarterKit.Data.Exceptions;
using StarterKit.WebApi.Tests.Infrastructure;

namespace StarterKit.WebApi.Tests.Mcp;

/// <summary>
/// Integration tests for the WebApi MCP endpoint (/mcp): auth gating, tool parity,
/// and a representative tools/call round-trip per docs/standards/backend/mcp.md.
/// </summary>
public abstract class McpEndpointTests : WebApiIntegrationTestBase
{
    protected McpEndpointTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    /// <summary>Connects a real MCP client over the test server's HttpClient.</summary>
    protected async Task<McpClient> CreateMcpClientAsync(
        Action<IServiceCollection>? configureServices = null
    )
    {
        var httpClient = CreateClientWithAuth(configureServices);
        var transport = new HttpClientTransport(
            new HttpClientTransportOptions
            {
                Endpoint = new Uri(httpClient.BaseAddress!, "/mcp"),
                TransportMode = HttpTransportMode.StreamableHttp,
            },
            httpClient
        );
        return await McpClient.CreateAsync(transport);
    }

    public sealed class Auth_Tests : McpEndpointTests
    {
        public Auth_Tests(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task PostMcp_WhenUnauthenticated_Returns401()
        {
            var client = Factory.CreateClient();
            var body = new StringContent(
                """{"jsonrpc":"2.0","id":1,"method":"tools/list"}""",
                Encoding.UTF8,
                "application/json"
            );

            var response = await client.PostAsync("/mcp", body);

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    public sealed class ToolsList_Tests : McpEndpointTests
    {
        public ToolsList_Tests(WebApplicationFactory<Program> factory)
            : base(factory) { }

        /// <summary>
        /// Parity lock: adding or removing an MCP tool must be a deliberate act — update this
        /// list together with the tool class (docs/standards/backend/mcp.md § Testing).
        /// </summary>
        private static readonly string[] ExpectedToolNames =
        [
            // Auditing
            "audit_logs_list",
            "audit_logs_get_by_id",
            "audit_logs_get_entity_names",
            // Auth
            "auth_get_me",
            "auth_revoke_sessions",
            // Clubs
            "clubs_list",
            "clubs_get_by_id",
            "clubs_create",
            "clubs_update",
            "clubs_delete",
            "clubs_get_upload_constraints",
            // Notifications
            "notifications_send_email",
            "notifications_send_sms",
            "notifications_list_messages",
            "notifications_get_message",
            "notifications_create_message",
            "notifications_update_message",
            "notifications_delete_message",
            "notifications_send_message",
            // Reports
            "reports_get_summary",
            "reports_get_trends",
            "reports_refresh",
            "reports_get_exclusions",
            "reports_add_exclusion",
            "reports_remove_exclusion",
            "reports_get_leave_records",
            "reports_create_leave_record",
            "reports_delete_leave_record",
            "reports_get_teams",
            "reports_get_team_trends",
            // Resources
            "resources_list",
            "resources_get_by_id",
            "resources_delete",
            // Roles
            "roles_list",
            "roles_get_permissions",
            "roles_get_by_id",
            "roles_create",
            "roles_update",
            "roles_deactivate",
            "roles_activate",
            "roles_update_permissions",
            "roles_get_assignments",
            // Seasons
            "seasons_list",
            "seasons_get_current",
            "seasons_create",
            // Teams
            "teams_list",
            "teams_get_by_id",
            "teams_create",
            "teams_update",
            "teams_delete",
            // Users
            "users_create",
            "users_list",
            "users_get_by_id",
            "users_link_to_club",
            "users_assign_role",
            "users_set_active",
            "users_update",
            "users_delete",
            "users_resend_setup",
            "users_get_defaults",
            "users_admin_change_password",
            "users_remove_avatar",
        ];

        [Fact]
        public async Task ListTools_ForFullyPermittedUser_ReturnsExactToolSet()
        {
            await using var mcpClient = await CreateMcpClientAsync();

            var tools = await mcpClient.ListToolsAsync();

            tools.Select(t => t.Name).Should().BeEquivalentTo(ExpectedToolNames);
        }

        [Fact]
        public async Task ListTools_EveryToolHasADescription()
        {
            await using var mcpClient = await CreateMcpClientAsync();

            var tools = await mcpClient.ListToolsAsync();

            tools
                .Where(t => string.IsNullOrWhiteSpace(t.Description))
                .Should()
                .BeEmpty("every MCP tool must carry a [Description] attribute");
        }
    }

    public sealed class CallTool_Tests : McpEndpointTests
    {
        public CallTool_Tests(WebApplicationFactory<Program> factory)
            : base(factory) { }

        private readonly Mock<IAuditLogService> _auditLogServiceMock = new();

        [Fact]
        public async Task CallTool_AuditLogsGetEntityNames_ReturnsSerializedList()
        {
            _auditLogServiceMock
                .Setup(x => x.GetDistinctEntityNamesAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(["Club", "User"]);

            await using var mcpClient = await CreateMcpClientAsync(services =>
                services.AddScoped<IAuditLogService>(_ => _auditLogServiceMock.Object)
            );

            var result = await mcpClient.CallToolAsync("audit_logs_get_entity_names");

            result.IsError.Should().NotBeTrue();
            var text = result.Content.OfType<TextContentBlock>().Single().Text;
            text.Should().Contain("Club").And.Contain("User");
        }

        [Fact]
        public async Task CallTool_WhenToolThrowsValidationException_SurfacesTheMessage()
        {
            // Guards inside tools must throw a type the shared DomainExceptionFilter maps
            // (ValidationException, not a bare InvalidOperationException) so the caller gets a
            // descriptive error instead of the SDK's generic "an error occurred".
            _auditLogServiceMock
                .Setup(x => x.GetDistinctEntityNamesAsync(It.IsAny<CancellationToken>()))
                .ThrowsAsync(new ValidationException("Audit log filter is invalid.", "bad-filter"));

            await using var mcpClient = await CreateMcpClientAsync(services =>
                services.AddScoped<IAuditLogService>(_ => _auditLogServiceMock.Object)
            );

            var result = await mcpClient.CallToolAsync("audit_logs_get_entity_names");

            result.IsError.Should().BeTrue();
            result
                .Content.OfType<TextContentBlock>()
                .Single()
                .Text.Should()
                .Contain("Audit log filter is invalid.");
        }

        [Fact]
        public async Task CallTool_WhenToolThrowsUnmappedException_DoesNotLeakTheMessage()
        {
            const string internalDetail = "Npgsql connection string host=secret-db";
            _auditLogServiceMock
                .Setup(x => x.GetDistinctEntityNamesAsync(It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException(internalDetail));

            await using var mcpClient = await CreateMcpClientAsync(services =>
                services.AddScoped<IAuditLogService>(_ => _auditLogServiceMock.Object)
            );

            var result = await mcpClient.CallToolAsync("audit_logs_get_entity_names");

            result.IsError.Should().BeTrue();
            result
                .Content.OfType<TextContentBlock>()
                .Single()
                .Text.Should()
                .NotContain(internalDetail, "unmapped exceptions must not leak internals");
        }
    }

    /// <summary>
    /// Regression: <c>Mcp:Enabled=false</c> must both skip mapping the endpoint and leave startup
    /// healthy even when Path/ServerName are absent — the ops kill-switch is worthless if an
    /// omitted Mcp section fails ValidateOnStart.
    /// </summary>
    public sealed class KillSwitch_Tests : McpEndpointTests
    {
        public KillSwitch_Tests(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task WhenMcpDisabledAndUnconfigured_AppStartsAndMcpIsNotMapped()
        {
            var client = Factory
                .WithWebHostBuilder(builder =>
                {
                    builder.UseSetting("Mcp:Enabled", "false");
                    // Empty values simulate the section being omitted entirely.
                    builder.UseSetting("Mcp:Path", string.Empty);
                    builder.UseSetting("Mcp:ServerName", string.Empty);
                })
                .CreateClient();

            // Startup succeeded (a ValidateOnStart failure would throw when the host is built).
            var health = await client.GetAsync("/healthz");
            health.StatusCode.Should().Be(HttpStatusCode.OK);

            var mcp = await client.PostAsync(
                "/mcp",
                new StringContent(
                    """{"jsonrpc":"2.0","id":1,"method":"tools/list"}""",
                    Encoding.UTF8,
                    "application/json"
                )
            );
            mcp.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }
}
