# TLS Certificates

If you want to run this app using HTTPS locally, you'll need to generate TLS
certificates for the server. I recommend using `mkcert`. See
https://web.dev/how-to-use-local-https/

The server will automatically discover files in this directory named
`localhost.pem` and `localhost-key.pem` if they exist.
