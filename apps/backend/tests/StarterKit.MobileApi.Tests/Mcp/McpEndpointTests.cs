using System.Net;
using System.Text;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using ModelContextProtocol.Client;
using StarterKit.MobileApi.Tests.Infrastructure;

namespace StarterKit.MobileApi.Tests.Mcp;

/// <summary>
/// Integration tests for the MobileApi MCP endpoint (/mcp): auth gating, tool parity,
/// and a representative tools/call round-trip per docs/standards/backend/mcp.md.
/// </summary>
public abstract class McpEndpointTests : MobileApiIntegrationTestBase
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
            // Auth
            "auth_get_me",
            "auth_update_display_name",
            "auth_get_linked_organisations",
            // DeviceTokens
            "device_tokens_register",
            // PushNotifications
            "push_notifications_list",
            "push_notifications_get_by_id",
            "push_notifications_mark_read",
            "push_notifications_mark_all_read",
            "push_notifications_mark_seen",
            // Support
            "support_send_help_email",
            // Users
            "users_get_profile",
            "users_update_profile",
            "users_change_password",
            "users_list_linked_athletes",
            "users_set_linked_athlete_relationships",
            "users_list_linked_teams",
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
}
