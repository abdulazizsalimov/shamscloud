#!/bin/bash

# ShamsCloud Auto-Deployment Script for Debian/Ubuntu
# This script automatically sets up ShamsCloud application on a clean Debian/Ubuntu server

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root. Please run as a regular user with sudo privileges."
    fi
}

# Check if sudo is available
check_sudo() {
    if ! command -v sudo &> /dev/null; then
        error "sudo is required but not installed. Please install sudo and add your user to sudoers."
    fi
}

# Update system packages
update_system() {
    log "Updating system packages..."
    sudo apt update
    sudo apt upgrade -y
}

# Install Node.js (version 20)
install_nodejs() {
    log "Installing Node.js 20..."
    
    # Remove any existing Node.js installations
    sudo apt remove --purge nodejs npm -y 2>/dev/null || true
    
    # Install Node.js 20 from NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install nodejs -y
    
    # Verify installation
    node --version
    npm --version
    
    log "Node.js and npm installed successfully"
}

# Install PostgreSQL
install_postgresql() {
    log "Installing PostgreSQL..."
    
    sudo apt install postgresql postgresql-contrib -y
    
    # Start and enable PostgreSQL service
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    log "PostgreSQL installed and started"
}

# Setup PostgreSQL database and user
setup_database() {
    log "Setting up PostgreSQL database..."
    
    # Generate random password for database user
    DB_PASSWORD=$(openssl rand -base64 32)
    
    # Create database and user
    sudo -u postgres psql << EOF
CREATE USER shamscloud WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE shamscloud OWNER shamscloud;
GRANT ALL PRIVILEGES ON DATABASE shamscloud TO shamscloud;
ALTER USER shamscloud CREATEDB;
\q
EOF
    
    # Store database credentials
    echo "DATABASE_URL=postgresql://shamscloud:$DB_PASSWORD@localhost:5432/shamscloud" > .env
    echo "PGHOST=localhost" >> .env
    echo "PGPORT=5432" >> .env
    echo "PGUSER=shamscloud" >> .env
    echo "PGPASSWORD=$DB_PASSWORD" >> .env
    echo "PGDATABASE=shamscloud" >> .env
    echo "NODE_ENV=production" >> .env
    
    log "Database setup completed. Credentials saved to .env file"
}

# Install other dependencies
install_dependencies() {
    log "Installing additional dependencies..."
    
    # Install build tools and other dependencies
    sudo apt install -y \
        build-essential \
        git \
        curl \
        wget \
        unzip \
        nginx \
        certbot \
        python3-certbot-nginx \
        ufw \
        htop
    
    log "Dependencies installed successfully"
}

# Extract and setup application
setup_application() {
    log "Setting up ShamsCloud application..."
    
    # Check if archive exists
    if [ ! -f "shamscloud-project.tar.gz" ]; then
        error "shamscloud-project.tar.gz not found in current directory!"
    fi
    
    # Extract archive
    tar -xzf shamscloud-project.tar.gz
    
    # Install npm dependencies
    log "Installing npm dependencies..."
    npm install
    
    # Build the application
    log "Building application..."
    npm run build
    
    log "Application setup completed"
}

# Setup database schema
setup_schema() {
    log "Setting up database schema..."
    
    # Push database schema
    npm run db:push
    
    log "Database schema created successfully"
}

# Setup systemd service
setup_systemd_service() {
    log "Setting up systemd service..."
    
    # Get current user and working directory
    CURRENT_USER=$(whoami)
    WORKING_DIR=$(pwd)
    
    # Create systemd service file
    sudo tee /etc/systemd/system/shamscloud.service > /dev/null << EOF
[Unit]
Description=ShamsCloud File Storage Application
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$WORKING_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=$WORKING_DIR/.env

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ReadWritePaths=$WORKING_DIR

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd and enable service
    sudo systemctl daemon-reload
    sudo systemctl enable shamscloud
    
    log "Systemd service created and enabled"
}

# Setup Nginx reverse proxy
setup_nginx() {
    log "Setting up Nginx reverse proxy..."
    
    # Remove default nginx site
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Create ShamsCloud nginx configuration
    sudo tee /etc/nginx/sites-available/shamscloud > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;  # Replace with your domain
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # File upload size limit
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF
    
    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/shamscloud /etc/nginx/sites-enabled/
    
    # Test nginx configuration
    sudo nginx -t
    
    # Restart nginx
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    log "Nginx configured and started"
}

# Setup firewall
setup_firewall() {
    log "Setting up firewall..."
    
    # Enable UFW
    sudo ufw --force enable
    
    # Allow SSH, HTTP, HTTPS
    sudo ufw allow ssh
    sudo ufw allow http
    sudo ufw allow https
    
    # Allow PostgreSQL only from localhost
    sudo ufw allow from 127.0.0.1 to any port 5432
    
    log "Firewall configured"
}

# Create admin user
create_admin_user() {
    log "Creating admin user..."
    
    echo
    echo -e "${BLUE}Please enter admin user details:${NC}"
    read -p "Admin email: " admin_email
    read -s -p "Admin password: " admin_password
    echo
    
    # Create admin user in database
    sudo -u postgres psql -d shamscloud << EOF
INSERT INTO users (email, name, password, role, quota, used_space, is_blocked, is_email_verified, created_at)
VALUES (
    '$admin_email',
    'Administrator',
    '\$2b\$10\$dummy_hash_replace_this',
    'admin',
    '107374182400',
    '0',
    false,
    true,
    NOW()
) ON CONFLICT (email) DO NOTHING;
EOF
    
    warning "Admin user created with email: $admin_email"
    warning "Please log in and change the password immediately!"
}

# Start services
start_services() {
    log "Starting services..."
    
    # Start ShamsCloud service
    sudo systemctl start shamscloud
    
    # Check service status
    if sudo systemctl is-active --quiet shamscloud; then
        log "ShamsCloud service started successfully"
    else
        error "Failed to start ShamsCloud service. Check logs with: sudo journalctl -u shamscloud"
    fi
}

# Display final information
display_final_info() {
    echo
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  ShamsCloud Installation Complete!   ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo
    echo -e "${BLUE}Application URL:${NC} http://your-server-ip"
    echo -e "${BLUE}Admin Panel:${NC} http://your-server-ip/admin"
    echo
    echo -e "${YELLOW}Important files:${NC}"
    echo "  - Environment variables: $(pwd)/.env"
    echo "  - Service logs: sudo journalctl -u shamscloud -f"
    echo "  - Nginx config: /etc/nginx/sites-available/shamscloud"
    echo
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Replace 'server_name _;' in /etc/nginx/sites-available/shamscloud with your domain"
    echo "  2. Setup SSL certificate: sudo certbot --nginx -d yourdomain.com"
    echo "  3. Configure your Firebase credentials in .env file"
    echo "  4. Log in as admin and change the password"
    echo
    echo -e "${YELLOW}Useful commands:${NC}"
    echo "  - Start service: sudo systemctl start shamscloud"
    echo "  - Stop service: sudo systemctl stop shamscloud"
    echo "  - Restart service: sudo systemctl restart shamscloud"
    echo "  - View logs: sudo journalctl -u shamscloud -f"
    echo "  - Check status: sudo systemctl status shamscloud"
    echo
}

# Main installation function
main() {
    log "Starting ShamsCloud installation..."
    
    check_root
    check_sudo
    update_system
    install_nodejs
    install_postgresql
    install_dependencies
    setup_database
    setup_application
    setup_schema
    setup_systemd_service
    setup_nginx
    setup_firewall
    create_admin_user
    start_services
    display_final_info
    
    log "Installation completed successfully!"
}

# Run main function
main "$@"