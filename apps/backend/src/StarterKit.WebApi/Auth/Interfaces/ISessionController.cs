using Microsoft.AspNetCore.Mvc;

namespace StarterKit.WebApi.Auth.Interfaces;

public interface ISessionController
{
    Task<IActionResult> RevokeSessions(CancellationToken cancellationToken);
}
