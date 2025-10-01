import { supabase } from "../supabaseClient";

// Function to fetch all products
export const fetchProducts = async () => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        product_images!product_id (*)
      `)
      .order("name");
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
};

// Function to fetch a single product by ID
export const fetchProductById = async (id) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        product_images(*)!product_id (*)
      `)
      .eq("id", id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error fetching product with ID ${id}:`, error);
    return null;
  }
};

// Function to create a new product
export const createProduct = async (productData) => {
  // The product_images are handled separately, so we destructure them out
  const { product_images, ...rest } = productData;

  try {
    const { data, error } = await supabase
      .from("products")
      .insert([rest]) // Use the rest of the data for the insert
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating product:", error);
    return null;
  }
};

// Function to update an existing product
export const updateProduct = async (id, productData) => {
  const { product_images, ...rest } = productData;

  try {
    const { data, error } = await supabase
      .from("products")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
      
    if (error) throw error;
    return { ...data, product_images: product_images };
  } catch (error) {
    console.error(`Error updating product with ID ${id}:`, error);
    return null;
  }
};

// Function to delete a product by ID
export const deleteProduct = async (id) => {
  try {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error deleting product with ID ${id}:`, error);
    return false;
  }
};

// --- NEW FUNCTION ---
// Function to link an additional image to a product
export const addProductImage = async (productId, imageUrl) => {
  try {
    const { data, error } = await supabase
      .from("product_images")
      .insert([{ product_id: productId, url: imageUrl }]);
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error adding product image:", error);
    return null;
  }
};

// Function to delete a single product image by its ID
export const deleteProductImage = async (imageId) => {
  try {
    const { error } = await supabase
      .from("product_images")
      .delete()
      .eq("id", imageId);
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting product image:", error);
    return false;
  }
};

export async function deleteImageFromStorage(imageUrl) {
  if (!imageUrl) return; // Do nothing if the URL is empty

  try {
    // The file name is the last part of the URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];

    if (!fileName) {
      throw new Error("Could not extract file name from URL.");
    }

    const { error } = await supabase.storage
      .from('product-images') // Make sure this is your bucket name
      .remove([fileName]);

    if (error) throw error;

    console.log(`Successfully deleted ${fileName} from storage.`);
  } catch (error) {
    console.error("Error deleting image from storage:", error);
    // We don't re-throw the error so that a failed storage delete 
    // doesn't stop the rest of the form submission process.
  }
}