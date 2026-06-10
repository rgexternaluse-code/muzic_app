param()
Set-StrictMode -Version Latest

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$root = Resolve-Path (Join-Path $scriptRoot '..')
$androidDir = Join-Path $root 'android'
$gradleVer = '8.14.3'
$tmp = Join-Path $env:TEMP "gradle-$gradleVer"
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
New-Item -ItemType Directory -Path $tmp | Out-Null

Write-Host "Downloading Gradle $gradleVer..."
$zip = Join-Path $tmp "gradle.zip"
Invoke-WebRequest -Uri "https://services.gradle.org/distributions/gradle-$gradleVer-bin.zip" -OutFile $zip -UseBasicParsing

Write-Host "Extracting gradle-wrapper.jar..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($zip, $tmp)
$src = Join-Path $tmp "gradle-$gradleVer\lib\gradle-wrapper.jar"
$dstDir = Join-Path $androidDir 'gradle\wrapper'
if (-Not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
Copy-Item -Path $src -Destination (Join-Path $dstDir 'gradle-wrapper.jar') -Force

Write-Host "Updating gradle-wrapper.properties"
$props = @(
  'distributionBase=GRADLE_USER_HOME',
  'distributionPath=wrapper/dists',
  "distributionUrl=https\://services.gradle.org/distributions/gradle-$gradleVer-bin.zip",
  'networkTimeout=10000',
  'validateDistributionUrl=true',
  'zipStoreBase=GRADLE_USER_HOME',
  'zipStorePath=wrapper/dists'
)
$props | Out-File -FilePath (Join-Path $dstDir 'gradle-wrapper.properties') -Encoding UTF8

Write-Host 'Done. Run: cd android; .\gradlew.bat assembleDebug'
