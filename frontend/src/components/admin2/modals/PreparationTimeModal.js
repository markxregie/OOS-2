import Swal from 'sweetalert2';

const PRODUCTS_BASE_URL = "http://localhost:8001";
const DELIVERY_BASE_URL = "http://localhost:7001";

// Helper to get image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return ""; // Return empty string if no path
  if (imagePath.startsWith("http")) return imagePath;
  return `${PRODUCTS_BASE_URL}${imagePath}`;
};

export const showPreparationTimeModal = async () => {
  // 1. Initial loading alert
  Swal.fire({
    title: 'Loading Products...',
    text: 'Please wait while we fetch the product list.',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  try {
    // 2. Fetch products and details, similar to menucontent.js
    const token = localStorage.getItem("authToken");
    if (!token) {
        throw new Error("Authentication token not found. Please log in.");
    }
    const headers = { Authorization: `Bearer ${token}` };

    const [productsResponse, productsDetailsResponse, prepTimesResponse] = await Promise.all([
        fetch(`${PRODUCTS_BASE_URL}/is_products/products/`, { headers }),
        fetch(`${PRODUCTS_BASE_URL}/is_products/products/details/`, { headers }),
        fetch(`${DELIVERY_BASE_URL}/delivery/prep-times`, { headers }),
    ]);

    if (!productsResponse.ok || !productsDetailsResponse.ok || !prepTimesResponse.ok) {
      throw new Error('Failed to fetch product data or preparation times.');
    }

    const apiProducts = await productsResponse.json();
    const apiProductsDetails = await productsDetailsResponse.json();
    const prepTimes = await prepTimesResponse.json();

    // Create a map for quick status lookup
    const productStatusMap = apiProductsDetails.reduce((acc, detail) => {
        acc[detail.ProductName] = detail.Status;
        return acc;
    }, {});

    // Filter and transform products
    const allProducts = apiProducts
        .filter(product => productStatusMap.hasOwnProperty(product.ProductName))
        .map(product => ({
            ...product,
            Status: productStatusMap[product.ProductName],
            // Use fetched prep time, or default
            PreparationTime: prepTimes[product.ProductID] || 15
        }))
        .sort((a, b) => a.ProductName.localeCompare(b.ProductName)); // Sort alphabetically

    // 3. Generate HTML for the modal
    const productRows = allProducts.map(product => `
      <div class="prep-time-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 5px; border-bottom: 1px solid #eee; gap: 15px;">
        <div style="display: flex; align-items: center; flex: 1; min-width: 0;">
            <img src="${getImageUrl(product.ProductImage)}" alt="${product.ProductName}" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover; margin-right: 10px;"/>
            <span style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${product.ProductName}</span>
        </div>
        <input 
          type="number" 
          class="swal2-input" 
          style="width: 80px; margin: 0; text-align: center;" 
          placeholder="Mins"
          value="${product.PreparationTime}" 
          data-product-id="${product.ProductID}"
          data-product-name="${product.ProductName}"
        >
      </div>
    `).join('');

    const modalHtml = `
      <div style="text-align: left; max-height: 60vh; overflow-y: auto; padding-right: 10px;">
        <p class="text-muted mb-3">Set the default preparation time in minutes for each product. This will be used to estimate delivery times.</p>
        <div class="prep-time-header" style="display: flex; justify-content: space-between; font-weight: bold; padding: 8px 5px; border-bottom: 2px solid #ccc; margin-bottom: 5px; position: sticky; top: 0; background: white; z-index: 1;">
            <span style="flex: 1; text-align: left;">Product</span>
            <span>Prep Time (mins)</span>
        </div>
        ${productRows}
      </div>
    `;

    // 4. Show the modal with the fetched product list
    Swal.fire({
      title: 'Set Product Preparation Times',
      html: modalHtml,
      width: '700px',
      showCancelButton: true,
      confirmButtonColor: '#4b929d',
      cancelButtonColor: '#dc3545',
      confirmButtonText: 'Save Settings',
      focusConfirm: false,
    }).then(async (result) => {
        if (result.isConfirmed) {
            // Collect all prep time values from inputs
            const inputs = document.querySelectorAll('input[data-product-id]');
            const prepTimes = [];
            
            inputs.forEach(input => {
                const productId = parseInt(input.getAttribute('data-product-id'));
                const productName = input.getAttribute('data-product-name');
                const prepTimeMinutes = parseInt(input.value) || 10; // Default to 10 if empty
                prepTimes.push({ productId, productName, prepTimeMinutes });
            });

            // Save to backend
            try {
                const token = localStorage.getItem("authToken");
                const response = await fetch('http://localhost:7001/delivery/prep-times', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ prepTimes }),
                });

                if (response.ok) {
                    Swal.fire('Saved!', 'Preparation time settings have been updated successfully.', 'success');
                } else {
                    const errorData = await response.json();
                    Swal.fire('Error!', `Failed to save: ${errorData.detail || 'Unknown error'}`, 'error');
                }
            } catch (error) {
                console.error('Error saving prep times:', error);
                Swal.fire('Error!', `Failed to save preparation times: ${error.message}`, 'error');
            }
        }
    });

  } catch (error) {
    console.error('Error in showPreparationTimeModal:', error);
    Swal.fire({
      icon: 'error',
      title: 'Failed to Load Products',
      text: 'Something went wrong while fetching the product list.',
      footer: `Error: ${error.message}`
    });
  }
};