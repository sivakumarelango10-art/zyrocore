import ProductForm from '../../product-form'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProductForm productId={parseInt(id)} />
}
