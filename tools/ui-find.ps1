# Le a arvore de acessibilidade procurando algo especifico.
param([string]$Padrao = "Usar este modelo")
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process -Name SlideStage -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $proc) { Write-Output "APP_NAO_ENCONTRADO"; exit 1 }
$raiz = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
$cond = New-Object System.Windows.Automation.PropertyCondition(
  [System.Windows.Automation.AutomationElement]::IsControlElementProperty, $true)
$todos = $raiz.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)
$achados = @()
foreach ($el in $todos) {
  $n = $el.GetCurrentPropertyValue([System.Windows.Automation.AutomationElement]::NameProperty)
  if ($n -and $n.ToString() -like "*$Padrao*") { $achados += $n.ToString() }
}
if ($achados.Count -eq 0) { Write-Output "NADA_COM: $Padrao (total elementos=$($todos.Count))" }
else { $achados | Select-Object -First 12 }
