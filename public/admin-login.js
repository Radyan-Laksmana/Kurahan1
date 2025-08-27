// Admin Login and CRUD functionality
class AdminApp {
    constructor() {
        this.isAuthenticated = false;
        this.currentData = [];
        this.editingRow = null;
        this.init();
    }

    init() {
        this.checkAuthStatus();
        this.bindEvents();
    }

    // Check if user is already authenticated
    async checkAuthStatus() {
        try {
            const response = await fetch('/auth/status');
            const data = await response.json();
            
            if (data.isAuthenticated) {
                this.isAuthenticated = true;
                this.showDashboard();
                this.updateUserInfo(data.username);
                this.loadData();
            } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            this.showLogin();
        }
    }

    // Show login form
    showLogin() {
        document.getElementById('loginForm').style.display = 'flex';
        document.getElementById('adminDashboard').style.display = 'none';
    }

    // Show admin dashboard
    showDashboard() {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
    }

    // Update user info in header
    updateUserInfo(username) {
        const userElement = document.getElementById('currentUser');
        if (userElement) {
            userElement.textContent = username || 'Admin';
        }
    }

    // Bind event listeners
    bindEvents() {
        // Login form
        document.getElementById('loginFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Data form
        document.getElementById('dataForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveData();
        });

        // Clear form button
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearForm();
        });

        // Refresh data button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadData();
        });
    }

    // Handle login
    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');

        // Validate inputs
        if (!username || !password) {
            this.showFormError('Username dan password harus diisi');
            return;
        }

        // Disable login button
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (data.success) {
                this.isAuthenticated = true;
                this.showToast('Login berhasil! Selamat datang kembali.', 'success');
                this.showDashboard();
                this.updateUserInfo(username);
                this.loadData();
                
                // Clear form
                document.getElementById('loginFormElement').reset();
                this.hideFormMessages();
            } else {
                this.showFormError(data.message || 'Login gagal. Periksa username dan password.');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showFormError('Error jaringan. Silakan coba lagi.');
        } finally {
            // Re-enable login button
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        }
    }

    // Show form error
    showFormError(message) {
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
    }

    // Hide form messages
    hideFormMessages() {
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
    }

    // Handle logout
    async handleLogout() {
        if (!confirm('Apakah Anda yakin ingin keluar?')) {
            return;
        }

        try {
            const response = await fetch('/logout', {
                method: 'POST',
            });

            const data = await response.json();

            if (data.success) {
                this.isAuthenticated = false;
                this.showToast('Logout berhasil!', 'success');
                this.showLogin();
                this.clearForm();
                this.currentData = [];
                this.editingRow = null;
                this.hideFormMessages();
            } else {
                this.showToast('Logout gagal', 'error');
            }
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('Error jaringan saat logout', 'error');
        }
    }

    // Load data from spreadsheet
    async loadData() {
        this.showLoadingState();
        
        try {
            const response = await fetch('/data');
            const data = await response.json();
            
            this.currentData = data;
            this.renderDataTable();
            this.hideLoadingState();
            this.showToast('Data berhasil dimuat!', 'success');
        } catch (error) {
            console.error('Error loading data:', error);
            this.hideLoadingState();
            this.showToast('Error memuat data', 'error');
        }
    }

    // Show loading state
    showLoadingState() {
        const loadingState = document.getElementById('loadingState');
        const dataTable = document.getElementById('dataTable');
        
        if (loadingState) loadingState.style.display = 'flex';
        if (dataTable) dataTable.style.display = 'none';
    }

    // Hide loading state
    hideLoadingState() {
        const loadingState = document.getElementById('loadingState');
        const dataTable = document.getElementById('dataTable');
        
        if (loadingState) loadingState.style.display = 'none';
        if (dataTable) dataTable.style.display = 'table';
    }

    // Render data table
    renderDataTable() {
        const tbody = document.getElementById('dataTableBody');
        tbody.innerHTML = '';

        if (!this.currentData || this.currentData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h3>Tidak ada data</h3>
                        <p>Belum ada data yang tersedia. Silakan tambahkan data baru.</p>
                    </td>
                </tr>
            `;
            return;
        }

        this.currentData.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${index + 1}</strong></td>
                <td>${this.escapeHtml(row.judul || '')}</td>
                <td>${this.escapeHtml(row.penulis || '')}</td>
                <td>${this.escapeHtml(row.tanggal || '')}</td>
                <td>${this.escapeHtml(row.jabatan || '')}</td>
                <td>${this.escapeHtml(row.nama || '')}</td>
                <td class="action-buttons">
                    <button class="action-btn edit-btn" onclick="adminApp.editRow(${row._row})" title="Edit">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn delete-btn" onclick="adminApp.deleteRow(${row._row})" title="Delete">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Edit row
    editRow(rowNumber) {
        const row = this.currentData.find(item => item._row === rowNumber);
        if (!row) {
            this.showToast('Data tidak ditemukan', 'error');
            return;
        }

        this.editingRow = rowNumber;
        this.fillForm(row);
        this.showToast(`Mengedit data baris ${rowNumber}`, 'info');
        
        // Scroll to form
        document.querySelector('.crud-section').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    // Fill form with data
    fillForm(data) {
        const fields = [
            'judul', 'penulis', 'tanggal', 'jabatan', 'nama', 'kontak',
            'lakiLaki', 'perempuan', 'keluarga', 'anakBalita',
            'namaUmkm', 'deskripsiUmkm', 'pengelola', 'deskripsi',
            'gambar', 'gambarUmkm'
        ];

        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                element.value = data[field] || '';
            }
        });

        document.getElementById('rowId').value = data._row || '';
        
        // Update save button text
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Data';
        }
    }

    // Clear form
    clearForm() {
        document.getElementById('dataForm').reset();
        document.getElementById('rowId').value = '';
        this.editingRow = null;
        
        // Reset save button text
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Data';
        }
        
        this.showToast('Form telah dibersihkan', 'info');
    }

    // Handle save data
    async handleSaveData() {
        const formData = this.getFormData();
        const rowId = document.getElementById('rowId').value;

        // Validate required fields
        if (!formData.judul || !formData.penulis || !formData.tanggal) {
            this.showToast('Judul, Penulis, dan Tanggal harus diisi', 'error');
            return;
        }

        const saveBtn = document.getElementById('saveBtn');
        const originalText = saveBtn.innerHTML;
        
        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

            let response;
            if (rowId && this.editingRow) {
                // Update existing row
                response = await fetch(`/data/${rowId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData),
                });
            } else {
                // Create new row
                response = await fetch('/data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData),
                });
            }

            const data = await response.json();

            if (response.ok) {
                this.showToast(
                    rowId ? 'Data berhasil diperbarui!' : 'Data berhasil ditambahkan!', 
                    'success'
                );
                this.clearForm();
                this.loadData();
            } else {
                this.showToast(data.error || 'Operasi gagal', 'error');
            }
        } catch (error) {
            console.error('Save error:', error);
            this.showToast('Error jaringan. Silakan coba lagi.', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }

    // Get form data
    getFormData() {
        const form = document.getElementById('dataForm');
        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            if (key !== 'rowId') {
                data[key] = value.trim();
            }
        }

        return data;
    }

    // Delete row
    async deleteRow(rowNumber) {
        if (!confirm('Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.')) {
            return;
        }

        try {
            const response = await fetch(`/data/${rowNumber}`, {
                method: 'DELETE',
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast('Data berhasil dihapus!', 'success');
                this.loadData();
                
                // Clear form if editing the deleted row
                if (this.editingRow === rowNumber) {
                    this.clearForm();
                }
            } else {
                this.showToast(data.error || 'Hapus data gagal', 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.showToast('Error jaringan. Silakan coba lagi.', 'error');
        }
    }

    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        // Clear any existing timeout
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }

        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'block';

        // Auto hide after 4 seconds
        this.toastTimeout = setTimeout(() => {
            toast.style.display = 'none';
        }, 4000);
    }

    // Hide toast notification
    hideToast() {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.style.display = 'none';
        }
    }
}

// Initialize the admin app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AdminApp();
    
    // Add click outside toast to hide
    document.addEventListener('click', (e) => {
        const toast = document.getElementById('toast');
        if (toast && e.target !== toast && !toast.contains(e.target)) {
            adminApp.hideToast();
        }
    });
});
