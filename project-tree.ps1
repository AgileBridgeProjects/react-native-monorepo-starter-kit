$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$ignoreDirs = @(
  'node_modules', '.git', '.github', '.husky', '.vscode', '.idea',
  '.expo', '.next', 'dist', 'build', 'coverage', 'bin', 'obj'
)

$ignoreFiles = @(
  '.DS_Store', 'Thumbs.db', 'package-lock.json'
)

function Show-Tree {
  param(
    [string]$Path = '.',
    [string]$Prefix = ''
  )

  $items = Get-ChildItem -LiteralPath $Path -Force | Where-Object {
    $name = $_.Name
    if ($_.PSIsContainer) {
      $ignoreDirs -notcontains $name
    }
    else {
      $ignoreFiles -notcontains $name
    }
  } | Sort-Object @{ Expression = { -not $_.PSIsContainer } }, Name

  for ($i = 0; $i -lt $items.Count; $i++) {
    $item = $items[$i]
    $isLast = $i -eq ($items.Count - 1)

    $branch = if ($isLast) { '\-- ' } else { '+-- ' }
    "$Prefix$branch$($item.Name)"

    if ($item.PSIsContainer) {
      $nextPrefix = if ($isLast) { "$Prefix    " } else { "$Prefix|   " }
      Show-Tree -Path $item.FullName -Prefix $nextPrefix
    }
  }
}

@(
  (Split-Path -Leaf (Get-Location))
  Show-Tree
) | Out-File -FilePath (Join-Path $scriptDir 'project-structure.txt') -Encoding utf8

Write-Host "Created project-structure.txt in $scriptDir"