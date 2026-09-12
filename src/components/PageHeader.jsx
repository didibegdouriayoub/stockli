import { useStore } from '../lib/StoreContext'

/** رأس موحَّد لكل الصفحات المحمية: شارة اسم المحل + عنوان الصفحة. */
export default function PageHeader({ title, action }) {
  const { store } = useStore()

  return (
    <header className="page-header">
      <div className="row-between">
        {store?.name && <span className="badge badge-neutral truncate store-badge">{store.name}</span>}
        {action}
      </div>
      <h1>{title}</h1>
    </header>
  )
}
