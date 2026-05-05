$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Server running at http://localhost:$port/index.html"
Write-Host "Press Ctrl+C to stop."

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/") { $localPath = "/index.html" }
        
        $filePath = Join-Path (Get-Location).Path $localPath
        $filePath = $filePath.Replace('/', '\')

        if (Test-Path $filePath -PathType Leaf) {
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $content.Length
            
            if ($filePath -match "\.html$") { $response.ContentType = "text/html" }
            elseif ($filePath -match "\.css$") { $response.ContentType = "text/css" }
            elseif ($filePath -match "\.js$") { $response.ContentType = "application/javascript" }
            
            $response.OutputStream.Write($content, 0, $content.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    } catch {
        # ignore context errors on exit
    }
}
