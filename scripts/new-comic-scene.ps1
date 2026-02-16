param(
    [string]$SceneName,
    [string]$BatchFile,
    [string]$Template = "assets/svg/comics/scenes/template.svg",
    [string]$Domain = "generic",
    [string]$DomainLine = "",
    [string]$HeaderLabel = "",
    [string]$StoryLine1 = "Person A: ""Do X now""",
    [string]$StoryLine2 = "Person B: ""I am stuck""",
    [string]$GreenLine = "Green: what is the first step?",
    [string]$CharacterTop = "",
    [string]$CharacterBottom = "",
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-TemplateExists {
    param([string]$TemplatePath)
    if (-not (Test-Path $TemplatePath)) {
        throw "Template file not found: $TemplatePath"
    }
}

function Apply-Replacement {
    param(
        [string]$Content,
        [string]$Pattern,
        [string]$Value
    )

    return [regex]::Replace(
        $Content,
        $Pattern,
        $Value,
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
}

function New-SceneFromSpec {
    param(
        [hashtable]$Spec,
        [switch]$UseForce
    )

    $sceneName = [string]$Spec.SceneName
    if ([string]::IsNullOrWhiteSpace($sceneName)) {
        throw "SceneName is required."
    }

    $templatePath = if ($Spec.Template) { [string]$Spec.Template } else { $Template }
    Assert-TemplateExists -TemplatePath $templatePath

    $domain = if ($Spec.Domain) { [string]$Spec.Domain } else { $Domain }
    $domainLine = if ($Spec.DomainLine) { [string]$Spec.DomainLine } else { $DomainLine }
    $headerLabel = if ($Spec.HeaderLabel) { [string]$Spec.HeaderLabel } else { $sceneName }
    $line1 = if ($Spec.StoryLine1) { [string]$Spec.StoryLine1 } else { $StoryLine1 }
    $line2 = if ($Spec.StoryLine2) { [string]$Spec.StoryLine2 } else { $StoryLine2 }
    $greenLine = if ($Spec.GreenLine) { [string]$Spec.GreenLine } else { $GreenLine }
    $topChar = if ($Spec.CharacterTop) { [string]$Spec.CharacterTop } else { $CharacterTop }
    $bottomChar = if ($Spec.CharacterBottom) { [string]$Spec.CharacterBottom } else { $CharacterBottom }

    $targetDir = Split-Path -Parent $templatePath
    $targetPath = Join-Path $targetDir "$sceneName.svg"

    if ((Test-Path $targetPath) -and (-not $UseForce)) {
        throw "Target scene already exists: $targetPath (use -Force to overwrite)"
    }

    $content = Get-Content -Raw -Encoding UTF8 $templatePath

    if ([string]::IsNullOrWhiteSpace($domainLine)) {
        $domainLine = "Domain: $domain  •  Story Mode"
    }

    $content = Apply-Replacement -Content $content -Pattern '(<text x="1140" y="70"[^>]*>).*?(</text>)' -Value ('$1' + $headerLabel + '$2')
    $content = Apply-Replacement -Content $content -Pattern '(<text x="1140" y="98"[^>]*>).*?(</text>)' -Value ('$1' + $domainLine + '$2')
    $content = Apply-Replacement -Content $content -Pattern '(<text x="780" y="252"[^>]*>).*?(</text>)' -Value ('$1' + $line1 + '$2')
    $content = Apply-Replacement -Content $content -Pattern '(<text x="780" y="292"[^>]*>).*?(</text>)' -Value ('$1' + $line2 + '$2')
    $content = Apply-Replacement -Content $content -Pattern '(<text x="1120" y="644"[^>]*>).*?(</text>)' -Value ('$1' + $greenLine + '$2')
    if (-not [string]::IsNullOrWhiteSpace($topChar)) {
        $content = Apply-Replacement -Content $content -Pattern '(<image href="\.\./\.\./characters/)[^"]+(" x="910" y="220" width="190" height="190"/>)' -Value ('$1' + $topChar + '$2')
    }
    if (-not [string]::IsNullOrWhiteSpace($bottomChar)) {
        $content = Apply-Replacement -Content $content -Pattern '(<image href="\.\./\.\./characters/)[^"]+(" x="910" y="410" width="190" height="190"/>)' -Value ('$1' + $bottomChar + '$2')
    }

    Set-Content -Path $targetPath -Value $content -Encoding UTF8
    Write-Output "Created: $targetPath"
}

if ($BatchFile) {
    if (-not (Test-Path $BatchFile)) {
        throw "Batch file not found: $BatchFile"
    }

    $raw = Get-Content -Raw -Encoding UTF8 $BatchFile
    $items = ConvertFrom-Json $raw

    if ($items -isnot [System.Collections.IEnumerable]) {
        throw "Batch JSON must be an array of scene specs."
    }

    foreach ($item in $items) {
        $spec = @{}
        foreach ($p in $item.PSObject.Properties) {
            $spec[$p.Name] = $p.Value
        }

        $specForce = if ($null -ne $spec["Force"]) { [bool]$spec["Force"] } else { $Force.IsPresent }
        New-SceneFromSpec -Spec $spec -UseForce:$specForce
    }

    exit 0
}

if ([string]::IsNullOrWhiteSpace($SceneName)) {
    throw "Use -SceneName for single generation, or -BatchFile for batch generation."
}

$singleSpec = @{
    SceneName = $SceneName
    Template = $Template
    Domain = $Domain
    DomainLine = $DomainLine
    HeaderLabel = $HeaderLabel
    StoryLine1 = $StoryLine1
    StoryLine2 = $StoryLine2
    GreenLine = $GreenLine
    CharacterTop = $CharacterTop
    CharacterBottom = $CharacterBottom
}

New-SceneFromSpec -Spec $singleSpec -UseForce:$Force.IsPresent
