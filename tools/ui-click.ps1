# Clica em um elemento da janela por nome (prefere botoes invocaveis).
param([string]$Botao = "Modelos")
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process -Name SlideStage -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $proc) { Write-Output "APP_NAO_ENCONTRADO"; exit 1 }

$raiz = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
$cond = New-object System.Windows.Automation.PropertyCondition(
  [System.Windows.Automation.AutomationElement]::IsControlElementProperty, $true)
$todos = $raiz.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)

$candidatos = @()
foreach ($el in $todos) {
  $n = $el.GetCurrentPropertyValue([System.Windows.Automation.AutomationElement]::NameProperty)
  if ($n -and $n.ToString() -eq $Botao) { $candidatos += $el }
}
if ($candidatos.Count -eq 0) { Write-Output "NAO_ACHOU: $Botao (total=$($todos.Count))"; exit 1 }

$padraoInvoke = [System.Windows.Automation.InvokePattern]::Pattern
foreach ($el in $candidatos) {
  $sup = $el.GetSupportedPatterns()
  if ($sup -contains $padraoInvoke) {
    $el.GetCurrentPattern($padraoInvoke).Invoke()
    Write-Output "CLICOU_BOTAO: $Botao"
    exit 0
  }
}
Write-Output "SEM_INVOKE: $Botao ($($candidatos.Count) candidatos)"
