import React, { useState, useEffect, useMemo } from 'react';
import { usePersistentState } from '../../hooks/usepersistentstate.js';
import './admin.css'; // Assuming ProductForm specific styles could go here or reuse admin.css

const defaultProductState = {
    name: '', price: '', description: '', short_description: '',
    stock_quantity: 0, category: 'Metal Caskets', image_url: '',
    product_images: []
  };

// Add apiError prop to receive errors from the parent
export default function ProductForm({ onSubmit, onCancel, initialData, loading, apiError }) {
  const [product, setProduct] = usePersistentState('productFormDraft', defaultProductState);
  const [mainImageFile, setMainImageFile] = useState(null);
  const [additionalImageFiles, setAdditionalImageFiles] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  const [draggingOver, setDraggingOver] = useState('');
  const [formError, setFormError] = useState(null); // Local form validation error

  useEffect(() => {
    if (initialData) {
      setProduct({ ...initialData, product_images: initialData.product_images || [] });
    } else {
      // If creating new, ensure draft loads or reset
       const draft = JSON.parse(window.localStorage.getItem('productFormDraft') || '{}');
       if (draft && Object.keys(draft).length > 0 && !initialData) {
           setProduct(draft);
       } else {
           setProduct(defaultProductState);
       }
    }
    // Reset file inputs and deletion list when initialData changes (or on new form)
    setMainImageFile(null);
    setAdditionalImageFiles([]);
    setImagesToDelete([]);
    setFormError(null); // Clear local errors
  }, [initialData]); // Removed setProduct from dependencies as it causes issues with usePersistentState

   // Effect to sync apiError from parent to local formError state
   useEffect(() => {
    setFormError(apiError);
   }, [apiError]);


  const existingImages = useMemo(() => {
    const allImages = [];
    if (product.image_url) {
      allImages.push({ id: 'main_image', url: product.image_url, isPrimary: true });
    }
    // Filter out images marked for deletion from display
    if (product.product_images) {
      const remainingImages = product.product_images.filter(
         img => !imagesToDelete.some(delImg => delImg.id === img.id)
      );
      allImages.push(...remainingImages);
    }
    return allImages;
  }, [product, imagesToDelete]); // Add imagesToDelete dependency

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const processedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    setProduct(prev => ({ ...prev, [name]: processedValue }));
    setFormError(null); // Clear errors on input change
  };

  const handleMainImageChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setMainImageFile(e.target.files[0]);
       setFormError(null); // Clear errors on file change
    }
  };

  const handleAdditionalImagesChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setAdditionalImageFiles(prev => [...prev, ...Array.from(e.target.files)]);
       setFormError(null); // Clear errors on file change
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Basic local validation (optional but good practice)
    if (!product.name || !product.price) {
        setFormError("Product Name and Price are required.");
        return;
    }
    // Pass mainImageFile and additionalImageFiles as separate arguments
    onSubmit(product, mainImageFile, additionalImageFiles, imagesToDelete);

    // Only reset form state if submission was likely successful (no immediate apiError)
    // Parent component handles the actual reset via view change and useEffect
    // setProduct(defaultProductState);
    // setMainImageFile(null);
    // setAdditionalImageFiles([]);
    // setImagesToDelete([]);
    // window.localStorage.removeItem('productFormDraft'); // Clear draft on successful submit
  };

  const handleCancelClick = () => {
    onCancel();
    // Resetting state is handled by parent's useEffect via initialData change
    // setProduct(defaultProductState);
    // setMainImageFile(null);
    // setAdditionalImageFiles([]);
    // setImagesToDelete([]);
    window.localStorage.removeItem('productFormDraft'); // Clear draft on cancel
    setFormError(null); // Clear errors on cancel
  };

  const handleMarkForDeletion = (image) => {
    // Add to deletion list
    setImagesToDelete(prev => [...prev, image]);
    // Immediately remove from display by filtering product state (will be undone if cancelled)
    // This is handled by the existingImages useMemo now
  };

  const handleDragEnter = (e, zone) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOver(zone);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOver('');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e, zone) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOver('');
     setFormError(null); // Clear error on drop

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (zone === 'main') {
        setMainImageFile(e.dataTransfer.files[0]);
      } else if (zone === 'additional') {
        setAdditionalImageFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
      }
      e.dataTransfer.clearData();
    }
  };

  return (
    // Add product-form class for potential specific styling
    <form onSubmit={handleSubmit} className="product-form">
      {/* Moved title logic to parent component */}
      {/* <h3>{initialData ? 'Edit Product' : 'Add New Product'}</h3> */}

      {/* Display API or local form error */}
      {formError && <p className="error-message">{formError}</p>}

      <div className="form-grid"> {/* Optional: Use grid for better layout */}
          <div className="form-group span-2"> {/* Span across two columns */}
            <label htmlFor="name">Product Name *</label>
            <input type="text" id="name" name="name" value={product.name || ''} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="price">Price *</label>
            <input type="number" id="price" name="price" value={product.price || ''} onChange={handleChange} required min="0" step="0.01"/>
          </div>
           <div className="form-group">
             <label htmlFor="stock_quantity">Stock Quantity</label>
             <input type="number" id="stock_quantity" name="stock_quantity" value={product.stock_quantity ?? 0} onChange={handleChange} min="0" />
           </div>
          <div className="form-group span-2">
            <label htmlFor="short_description">Short Description</label>
            <input type="text" id="short_description" name="short_description" value={product.short_description || ''} onChange={handleChange} />
          </div>
          <div className="form-group span-2">
            <label htmlFor="description">Full Description</label>
            <textarea id="description" name="description" value={product.description || ''} onChange={handleChange} rows="4"></textarea>
          </div>

          <div className="form-group span-2">
            <label htmlFor="category">Category</label>
            <select id="category" name="category" value={product.category || 'Metal Caskets'} onChange={handleChange}>
                <option>Metal Caskets</option>
                <option>Wood Caskets</option>
                <option>Cremation Urns</option>
                {/* Add other categories as needed */}
            </select>
          </div>
      </div>


      {initialData && existingImages.length > 0 && ( // Only show existing for edits
        <div className="form-group">
          <label>Existing Images (Click X to remove)</label>
          <div className="existing-images-grid">
            {existingImages.map(image => (
              <div key={image.id || image.url} className="existing-image-item">
                <img src={image.url} alt="Existing product" />
                {image.isPrimary ? (
                  <span className="primary-tag">Primary</span>
                ) : (
                  <button type="button" onClick={() => handleMarkForDeletion(image)} title="Mark for removal">
                    {/* X is now added via CSS ::after */}
                  </button>
                )}
              </div>
            ))}
          </div>
          {imagesToDelete.length > 0 && (
             <p><small>Images marked for removal: {imagesToDelete.length}</small></p>
          )}
        </div>
      )}

      <div className="form-grid image-uploads"> {/* Grid layout for image uploads */}
          <div className="form-group">
            <label htmlFor="main_image_upload">
                {initialData ? 'Replace Main Image' : 'Main Image *'}
            </label>
            <div
              className={`drop-zone ${draggingOver === 'main' ? 'dragging' : ''}`}
              onDrop={(e) => handleDrop(e, 'main')}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, 'main')}
              onDragLeave={handleDragLeave}
            >
              <p>Drag & drop main image, or click</p>
              <input
                type="file" id="main_image_upload" onChange={handleMainImageChange}
                accept="image/png, image/jpeg, image/webp" disabled={loading}
                // Conditionally require main image only when creating new
                required={!initialData && !product.image_url}
              />
            </div>
            {mainImageFile && (
              <div className="image-preview">
                <p><small>New main image:</small></p>
                <p><small>- {mainImageFile.name}</small></p>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="additional_images_upload">Add Additional Images</label>
            <div
              className={`drop-zone ${draggingOver === 'additional' ? 'dragging' : ''}`}
              onDrop={(e) => handleDrop(e, 'additional')}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, 'additional')}
              onDragLeave={handleDragLeave}
            >
              <p>Drag & drop additional images, or click</p>
              <input
                type="file" id="additional_images_upload" onChange={handleAdditionalImagesChange}
                accept="image/png, image/jpeg, image/webp" disabled={loading} multiple
              />
            </div>
            {additionalImageFiles.length > 0 && (
              <div className="image-preview">
                <p><small>New additional images ({additionalImageFiles.length}):</small></p>
                {/* Optionally list file names */}
                {/* {additionalImageFiles.map((file, index) => (
                  <p key={index}><small>- {file.name}</small></p>
                ))} */}
              </div>
            )}
          </div>
       </div>

      <div className="form-actions">
        <button type="button" onClick={handleCancelClick} disabled={loading} className="cancel-button">Cancel</button>
        <button type="submit" disabled={loading} className="save-button">
          {loading ? 'Saving...' : (initialData ? 'Update Product' : 'Save New Product')}
        </button>
      </div>
    </form>
  );
}