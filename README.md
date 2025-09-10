EntbySys Pvt Ltd.

# Project Q2O

## Development Environment Setup

### SSL Certificate for Local Development (HTTPS)

For running the application with HTTPS locally, you need to generate a self-signed certificate.

**1. Generate the Certificate:**

A script is provided to generate the necessary certificate files.

First, ensure the script is executable:
```bash
chmod +x scripts/gen-dev-cert.sh
```
If you face permission issues, you might also need to add read permissions:
```bash
chmod u+r scripts/gen-dev-cert.sh
```

Then, run the script:
```bash
bash scripts/gen-dev-cert.sh
```
This will create a `certs` directory with `q2o-cert.pem` and `q2o-key.pem` files.

**2. Trusting the Certificate on Ubuntu:**

To avoid browser warnings, you should instruct your system to trust the generated certificate. On Ubuntu, you can do this as follows:

1.  Copy the certificate to the system's certificate store. You'll need to rename it with a `.crt` extension.
    ```bash
    sudo cp certs/q2o-cert.pem /usr/local/share/ca-certificates/q2o.crt
    ```

2.  Update the certificate store.
    ```bash
    sudo update-ca-certificates
    ```

After these steps, your browser should trust the local development server's SSL certificate.
