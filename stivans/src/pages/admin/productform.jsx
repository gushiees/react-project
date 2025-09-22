import React, { useState, useEffect, useMemo } from 'react';
import { usePersistentState } from '../../hooks/usepersistentstate.js';

const defaultProductState = {
    name: '', price: '', description: '', short_description: '',
    stock_quantity: 0, category: 'Metal Caskets', image_url: '',
    product_images: []
  };
export default function ProductForm({ onSubmit, onCancel, initialData, loading }) {
  const [product, setProduct] = usePersistentState('productFormDraft', defaultProductState);
  const [mainImageFile, setMainImageFile] = useState(null);
  const [additionalImageFiles, setAdditionalImageFiles] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  const [draggingOver, setDraggingOver] = useState(''); // 'main', 'additional', or ''

  // --- UPDATED useEffect ---
  useEffect(() => {
    if (initialData) {
      // If we are editing, fill the form with the product's data.
      setProduct({ ...initialData, product_images: initialData.product_images || [] });
    } else {
      // If we are creating a new product, clear the form to its default state.
      setProduct(defaultProductState);
    }
    // Clear the file and deletion lists whenever the form mode changes.
    setMainImageFile(null);
    setAdditionalImageFiles([]);
    setImagesToDelete([]);
  }, [initialData, setProduct]);

  const existingImages = useMemo(() => {
    const allImages = [];
    if (product.image_url) {
      allImages.push({ id: 'main_image', url: product.image_url, isPrimary: true });
    }
    if (product.product_images) {
      allImages.push(...product.product_images);
    }
    return allImages;
  }, [product]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct(prev => ({ ...prev, [name]: value }));
  };

  const handleMainImageChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setMainImageFile(e.target.files[0]);
    }
  };

  const handleAdditionalImagesChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setAdditionalImageFiles(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(product, mainImageFile, additionalImageFiles, imagesToDelete);
    setProduct(defaultProductState);
    setMainImageFile(null);
    setAdditionalImageFiles([]);
  };

  const handleCancelClick = () => {
    onCancel();
    setProduct(defaultProductState);
    setMainImageFile(null);
    setAdditionalImageFiles([]);
  };

  const handleMarkForDeletion = (imageId) => {
    setImagesToDelete(prev => [...prev, imageId]);
    setProduct(prev => ({
        ...prev,
        product_images: prev.product_images.filter(img => img.id !== imageId)
    }));
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
    <form onSubmit={handleSubmit} className="product-form">
      <h3>{initialData ? 'Edit Product' : 'Add New Product'}</h3>
      
      <div className="form-group">
        <label htmlFor="name">Product Name</label>
        <input type="text" name="name" value={product.name || ''} onChange={handleChange} required />
      </div>
      <div className="form-group">
        <label htmlFor="price">Price</label>
        <input type="number" name="price" value={product.price || ''} onChange={handleChange} required />
      </div>
      <div className="form-group">
        <label htmlFor="short_description">Short Description</label>
        <input type="text" name="short_description" value={product.short_description || ''} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label htmlFor="description">Full Description</label>
        <textarea name="description" value={product.description || ''} onChange={handleChange} rows="4"></textarea>
      </div>
      <div className="form-group">
        <label htmlFor="stock_quantity">Stock Quantity</label>
        <input type="number" name="stock_quantity" value={product.stock_quantity || 0} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label htmlFor="category">Category</label>
        <select name="category" value={product.category} onChange={handleChange}>
            <option>Metal Caskets</option>
            <option>Wood Caskets</option>
            <option>Cremation Urns</option>
        </select>
      </div>

      {existingImages.length > 0 && (
        <div className="form-group">
          <label>Existing Images (Main & Additional)</label>
          <div className="existing-images-grid">
            {existingImages.map(image => (
              <div key={image.id} className="existing-image-item">
                <img src={image.url} alt="Existing product" />
                {image.isPrimary ? (
                  <span className="primary-tag">Primary</span>
                ) : (
                  <button type="button" onClick={() => handleMarkForDeletion(image.id)}>Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="main_image_upload">Main Image</label>
        <div
          className={`drop-zone ${draggingOver === 'main' ? 'dragging' : ''}`}
          onDrop={(e) => handleDrop(e, 'main')}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, 'main')}
          onDragLeave={handleDragLeave}
        >
          <p>Drag & drop main image here, or click to select a file</p>
          <input
            type="file" id="main_image_upload" onChange={handleMainImageChange}
            accept="image/png, image/jpeg" disabled={loading}
          />
        </div>
        {mainImageFile && (
          <div className="image-preview">
            <p><small>New main image to upload:</small></p>
            <p><small>- {mainImageFile.name}</small></p>
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="additional_images_upload">Additional Images</label>
        <div
          className={`drop-zone ${draggingOver === 'additional' ? 'dragging' : ''}`}
          onDrop={(e) => handleDrop(e, 'additional')}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, 'additional')}
          onDragLeave={handleDragLeave}
        >
          <p>Drag & drop additional images here, or click to select files</p>
          <input
            type="file" id="additional_images_upload" onChange={handleAdditionalImagesChange}
            accept="image/png, image/jpeg" disabled={loading} multiple
          />
        </div>
        {additionalImageFiles.length > 0 && (
          <div className="image-preview">
            <p><small>New additional images to upload:</small></p>
            {additionalImageFiles.map((file, index) => (
              <p key={index}><small>- {file.name}</small></p>
            ))}
          </div>
        )}
      </div>

      <div className="form-actions">
        <button type="button" onClick={handleCancelClick} disabled={loading}>Cancel</button>
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Product'}
        </button>
      </div>
    </form>
  );
}