# Le a arvore de acessibilidade da janela do SlideStage (prova de render).
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process -Name SlideStage -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $proc) { Write-Output "APP_NAO_ENCONTRADO"; exit 1 }
if ($proc.MainWindowHandle -eq 0) { Write-Output "SEM_JANELA"; exit 1 }

$root = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
if ($null -eq $root) { Write-Output "SEM_ELEMENTO_RAIZ"; exit 1 }

$cond = New-Object System.Windows.Automation.PropertyCondition(
  [System.Windows.Automation.AutomationElement]::IsControlElementProperty, $true)
$todos = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)
$botoes = @()
foreach ($el in $todos) {
  $tipo = $el.GetCurrentPropertyValue([System.Windows.Automation.AutomationElement]::ControlTypeProperty)
  if ($tipo -eq [System.Windows.Automation.ControlType]::Button -or $tipo -eq [System.Windows.Automation.ControlType]::Edit) {
    $nome = $el.GetCurrentPropertyValue([System.Windows.Automation.AutomationElement]::NameProperty)
    if ($nome) { $botoes += "$nome" }
  }
}
Write-Output "ELEMENTOS_INTERATIVOS=$($todos.Count)"
Write-Output ("BOTOES: " + (($botoes | Select-Object -Unique) -join " | "))
