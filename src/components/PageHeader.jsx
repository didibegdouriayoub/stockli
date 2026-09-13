import { useStore } from '../lib/StoreContext'
import { IconStore } from './icons'

/** رأس موحَّد لكل الصفحات المحمية: شارة اسم المحل + عنوان الصفحة. */
export default function PageHeader({ title, action }) {
  const { store } = useStore()

  return (
    <header className="page-header">
      <div className="row-between">
        {store?.name && (
          <span className="store-badge truncate">
            <IconStore className="store-badge-icon" width={20} height={20} strokeWidth={2.2} />
            {store.name}
          </span>
        )}
        {action}
      </div>
      <h1>{title}</h1>
    </header>
  )
}
