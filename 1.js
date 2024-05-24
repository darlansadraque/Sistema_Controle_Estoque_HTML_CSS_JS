document.addEventListener('DOMContentLoaded', () => {
    const productForm = document.getElementById('product-form');
    const productList = document.getElementById('product-list');
    const productNameInput = document.getElementById('product-name');
    const productQuantityInput = document.getElementById('product-quantity');
    const productPriceInput = document.getElementById('product-price');
    const searchBar = document.getElementById('search-bar');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    const exportDataBtn = document.getElementById('export-data');
    const importDataInput = document.getElementById('import-data');
    const lowStockList = document.getElementById('low-stock-list');
    const historyList = document.getElementById('history-list');
    const reportsTable = document.getElementById('reports-table');
    const toggleThemeBtn = document.getElementById('toggle-theme');
    const authForm = document.getElementById('auth-form');
    const authStatus = document.getElementById('auth-status');
    const addProductSection = document.getElementById('add-product');
    const inventorySection = document.getElementById('inventory');
    const exportImportSection = document.getElementById('export-import');
    const lowStockSection = document.getElementById('low-stock');
    const historySection = document.getElementById('history');
    const reportsSection = document.getElementById('reports');

    const dbName = 'InventoryDB';
    const dbVersion = 1;
    let db;
    let editId = null;
    let currentPage = 1;
    const itemsPerPage = 5;
    let allProducts = [];

    const users = {
        admin: 'admin123'
    };

    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (users[username] && users[username] === password) {
            authStatus.textContent = 'Login bem-sucedido!';
            authStatus.style.color = 'green';
            sessionStorage.setItem('authenticated', true);
            showSections();
        } else {
            authStatus.textContent = 'Usuário ou senha incorretos.';
            authStatus.style.color = 'red';
        }
    });

    const showSections = () => {
        addProductSection.classList.remove('hidden');
        inventorySection.classList.remove('hidden');
        exportImportSection.classList.remove('hidden');
        lowStockSection.classList.remove('hidden');
        historySection.classList.remove('hidden');
        reportsSection.classList.remove('hidden');
        document.getElementById('user-auth').classList.add('hidden');
    };

    const openDB = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, dbVersion);

            request.onupgradeneeded = (event) => {
                db = event.target.result;
                const objectStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
                objectStore.createIndex('name', 'name', { unique: false });
                const priceHistoryStore = db.createObjectStore('priceHistory', { keyPath: 'id', autoIncrement: true });
                priceHistoryStore.createIndex('productId', 'productId', { unique: false });
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                resolve(db);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };

    const getProducts = () => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products'], 'readonly');
            const objectStore = transaction.objectStore('products');
            const request = objectStore.getAll();

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };

    const addProduct = (name, quantity, price) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products'], 'readwrite');
            const objectStore = transaction.objectStore('products');
            const request = objectStore.add({ name, quantity, price });

            request.onsuccess = (event) => {
                const productId = event.target.result;
                addPriceHistory(productId, price);
                resolve();
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };

    const updateProduct = (id, name, quantity, price) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products'], 'readwrite');
            const objectStore = transaction.objectStore('products');
            const request = objectStore.put({ id, name, quantity, price });

            request.onsuccess = () => {
                addPriceHistory(id, price);
                resolve();
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };

    const addPriceHistory = (productId, price) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['priceHistory'], 'readwrite');
            const objectStore = transaction.objectStore('priceHistory');
            const request = objectStore.add({ productId, price, date: new Date() });

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };

    const getPriceHistory = (productId) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['priceHistory'], 'readonly');
            const objectStore = transaction.objectStore('priceHistory');
            const index = objectStore.index('productId');
            const request = index.getAll(productId);

            request.onsuccess = (event) => {
                resolve(event.target.result);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };

    const deleteProduct = (id) => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['products'], 'readwrite');
            const objectStore = transaction.objectStore('products');
            const request = objectStore.delete(id);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    };

    const renderProducts = async (page = 1) => {
        const products = await getProducts();
        allProducts = products;
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedProducts = products.slice(start, end);

        productList.innerHTML = '';
        paginatedProducts.forEach((product) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${product.name}</td>
                <td>${product.quantity}</td>
                <td>${product.price}</td>
                <td class="actions">
                    <button class="btn btn-warning edit" onclick="editProduct(${product.id})">Editar</button>
                    <button class="btn btn-danger" onclick="deleteProduct(${product.id})">Excluir</button>
                    <button class="btn btn-info" onclick="showPriceHistory(${product.id})">Histórico de Preços</button>
                </td>
            `;
            productList.appendChild(tr);
        });
        pageInfo.textContent = `Página ${page} de ${Math.ceil(products.length / itemsPerPage)}`;
        prevPageBtn.disabled = page === 1;
        nextPageBtn.disabled = page === Math.ceil(products.length / itemsPerPage);
    };

    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = productNameInput.value;
        const quantity = productQuantityInput.value;
        const price = productPriceInput.value;
        if (editId === null) {
            await addProduct(name, quantity, price);
            logHistory('Adicionado', { name, quantity, price });
        } else {
            await updateProduct(editId, name, quantity, price);
            logHistory('Atualizado', { name, quantity, price });
            editId = null;
        }
        productForm.reset();
        renderProducts(currentPage);
        checkLowStock();
        renderReports();
    });

    const showPriceHistory = async (productId) => {
        const history = await getPriceHistory(productId);
        alert(history.map(entry => `Data: ${new Date(entry.date).toLocaleString()}, Preço: ${entry.price}`).join('\n'));
    };

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderProducts(currentPage);
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (currentPage < Math.ceil(allProducts.length / itemsPerPage)) {
            currentPage++;
            renderProducts(currentPage);
        }
    });

    searchBar.addEventListener('input', () => {
        const query = searchBar.value.toLowerCase();
        const filteredProducts = allProducts.filter(product => product.name.toLowerCase().includes(query));
        renderFilteredProducts(filteredProducts);
    });

    const renderFilteredProducts = (products) => {
        productList.innerHTML = '';
        products.forEach((product) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${product.name}</td>
                <td>${product.quantity}</td>
                <td>${product.price}</td>
                <td class="actions">
                    <button class="btn btn-warning edit" onclick="editProduct(${product.id})">Editar</button>
                    <button class="btn btn-danger" onclick="deleteProduct(${product.id})">Excluir</button>
                    <button class="btn btn-info" onclick="showPriceHistory(${product.id})">Histórico de Preços</button>
                </td>
            `;
            productList.appendChild(tr);
        });
        pageInfo.textContent = `Exibindo ${products.length} resultados`;
        prevPageBtn.disabled = true;
        nextPageBtn.disabled = true;
    };

    exportDataBtn.addEventListener('click', () => {
        exportData();
    });

    importDataInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            importData(file);
        }
    });

    const exportData = async () => {
        const products = await getProducts();
        const csvContent = 'data:text/csv;charset=utf-8,' + products.map(product => `${product.name},${product.quantity},${product.price}`).join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'inventory.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const importData = (file) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const csv = event.target.result;
            const rows = csv.split('\n');
            for (const row of rows) {
                const [name, quantity, price] = row.split(',');
                if (name && quantity && price) {
                    await addProduct(name, parseInt(quantity), parseFloat(price));
                }
            }
            renderProducts(currentPage);
        };
        reader.readAsText(file);
    };

    const checkLowStock = async () => {
        const products = await getProducts();
        const lowStockProducts = products.filter(product => product.quantity <= 2);
        lowStockList.innerHTML = '';
        if (lowStockProducts.length > 0) {
            lowStockProducts.forEach(product => {
                const li = document.createElement('li');
                li.classList.add('list-group-item');
                li.textContent = `${product.name} - ${product.quantity} unidades`;
                lowStockList.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.classList.add('list-group-item');
            li.textContent = "Nenhum produto com estoque baixo.";
            lowStockList.appendChild(li);
        }
    };

    const logHistory = (action, product) => {
        const timestamp = new Date().toLocaleString();
        const entry = `${timestamp}: ${action} - ${product.name}, Quantidade: ${product.quantity}, Preço: ${product.price}`;
        const li = document.createElement('li');
        li.classList.add('list-group-item');
        li.textContent = entry;
        historyList.appendChild(li);
    };

    const renderReports = async () => {
        const products = await getProducts();
        reportsTable.innerHTML = `
            <thead>
                <tr>
                    <th>Produto</th>
                    <th>Preço</th>
                    <th>Quantidade</th>
                    <th>Valor Total Investido</th>
                </tr>
            </thead>
            <tbody>
                ${products.map(product => `
                    <tr>
                        <td>${product.name}</td>
                        <td>${product.price}</td>
                        <td>${product.quantity}</td>
                        <td>${product.price * product.quantity}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
    };

    window.editProduct = async (id) => {
        const transaction = db.transaction(['products'], 'readonly');
        const objectStore = transaction.objectStore('products');
        const request = objectStore.get(id);

        request.onsuccess = (event) => {
            const product = event.target.result;
            productNameInput.value = product.name;
            productQuantityInput.value = product.quantity;
            productPriceInput.value = product.price;
            editId = id;
        };
    };

    window.deleteProduct = async (id) => {
        const transaction = db.transaction(['products'], 'readwrite');
        const objectStore = transaction.objectStore('products');
        const request = objectStore.get(id);

        request.onsuccess = async (event) => {
            const product = event.target.result;
            await deleteProduct(id);
            logHistory('Deletado', product);
            renderProducts(currentPage);
            checkLowStock();
            renderReports();
        };
    };

    toggleThemeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
    });

    openDB().then(() => {
        renderProducts(currentPage);
        checkLowStock();
        renderReports();
    });
});
