import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, LogOut, RefreshCw, ShieldCheck, Truck, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import api from '@/services/api'

type StoredAdmin = {
  id: string
  email: string
  full_name: string
  role: string
  agency_id: string | null
  agency_name: string | null
}

type DashboardSnapshot = {
  health: unknown | null
  agencies: unknown[]
  drivers: unknown[]
  vehicles: unknown[]
}

const adminStorageKey = 'smartdrive_admin'

export default function HomePage() {
  const navigate = useNavigate()
  const [admin, setAdmin] = useState<StoredAdmin | null>(null)
  const [loading, setLoading] = useState(false)
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>({
    health: null,
    agencies: [],
    drivers: [],
    vehicles: [],
  })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const savedAdmin = localStorage.getItem(adminStorageKey)

    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    if (savedAdmin) {
      try {
        setAdmin(JSON.parse(savedAdmin) as StoredAdmin)
      } catch {
        localStorage.removeItem(adminStorageKey)
      }
    }

    void loadSnapshot()
  }, [navigate])

  const loadSnapshot = async () => {
    setLoading(true)
    try {
      const [healthRes, agenciesRes, driversRes, vehiclesRes] = await Promise.all([
        api.get('/health', { baseURL: 'http://localhost:5001' }),
        api.get('/agencies'),
        api.get('/drivers', { params: { page: 1, limit: 5 } }),
        api.get('/vehicles', { params: { page: 1, limit: 5 } }),
      ])

      setSnapshot({
        health: healthRes.data,
        agencies: agenciesRes.data.data ?? [],
        drivers: driversRes.data.data ?? [],
        vehicles: vehiclesRes.data.data ?? [],
      })
    } catch (error) {
      console.error('Khong tai duoc du lieu dashboard', error)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error', error)
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem(adminStorageKey)
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">SmartDrive</p>
              <h1 className="text-3xl font-bold">Trang home de test backend tu frontend</h1>
              <p className="max-w-3xl text-sm text-slate-600">
                Trang nay khong phai dashboard cuoi cung. Muc tieu cua no la de ban dang nhap xong co noi dung de test API that: agencies, drivers, vehicles va token auth.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={() => void loadSnapshot()} disabled={loading}>
                <RefreshCw className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
                Tai lai du lieu
              </Button>
              <Button type="button" variant="destructive" onClick={() => void logout()}>
                <LogOut className="mr-2 size-4" />
                Dang xuat
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 inline-flex rounded-xl bg-blue-100 p-3 text-blue-700"><ShieldCheck className="size-5" /></div>
            <p className="text-sm text-slate-500">Tai khoan hien tai</p>
            <h2 className="mt-1 text-lg font-semibold">{admin?.full_name ?? 'Chua co thong tin'}</h2>
            <p className="text-sm text-slate-600">{admin?.email ?? 'Chua dang nhap'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 inline-flex rounded-xl bg-amber-100 p-3 text-amber-700"><Building2 className="size-5" /></div>
            <p className="text-sm text-slate-500">Dai ly</p>
            <h2 className="mt-1 text-lg font-semibold">{admin?.agency_name ?? 'Toan he thong'}</h2>
            <p className="text-sm text-slate-600">Role: {admin?.role ?? '-'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 inline-flex rounded-xl bg-emerald-100 p-3 text-emerald-700"><Users className="size-5" /></div>
            <p className="text-sm text-slate-500">Tai xe lay mau</p>
            <h2 className="mt-1 text-lg font-semibold">{snapshot.drivers.length}</h2>
            <p className="text-sm text-slate-600">Dang lay 5 ban ghi dau tien</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 inline-flex rounded-xl bg-violet-100 p-3 text-violet-700"><Truck className="size-5" /></div>
            <p className="text-sm text-slate-500">Xe lay mau</p>
            <h2 className="mt-1 text-lg font-semibold">{snapshot.vehicles.length}</h2>
            <p className="text-sm text-slate-600">Dang lay 5 ban ghi dau tien</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Du lieu lay tu backend</h2>
                <p className="text-sm text-slate-600">Doi chieu nhanh de xem token auth va API co thong tu FE hay khong.</p>
              </div>
              <div className="text-right text-sm text-slate-500">
                <div>Health: {(snapshot.health as { status?: string } | null)?.status ?? 'chua tai'}</div>
                <div>Agencies: {snapshot.agencies.length}</div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <article className="rounded-2xl bg-slate-950 p-4 text-slate-100">
                <p className="mb-2 text-sm font-semibold text-slate-300">Health</p>
                <pre className="overflow-auto text-xs leading-6">{JSON.stringify(snapshot.health, null, 2)}</pre>
              </article>
              <article className="rounded-2xl bg-slate-950 p-4 text-slate-100">
                <p className="mb-2 text-sm font-semibold text-slate-300">Agencies</p>
                <pre className="overflow-auto text-xs leading-6">{JSON.stringify(snapshot.agencies, null, 2)}</pre>
              </article>
              <article className="rounded-2xl bg-slate-950 p-4 text-slate-100">
                <p className="mb-2 text-sm font-semibold text-slate-300">Drivers</p>
                <pre className="overflow-auto text-xs leading-6">{JSON.stringify(snapshot.drivers, null, 2)}</pre>
              </article>
              <article className="rounded-2xl bg-slate-950 p-4 text-slate-100">
                <p className="mb-2 text-sm font-semibold text-slate-300">Vehicles</p>
                <pre className="overflow-auto text-xs leading-6">{JSON.stringify(snapshot.vehicles, null, 2)}</pre>
              </article>
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Loi di test nhanh</h2>
              <p className="mt-2 text-sm text-slate-600">
                Từ đây bạn có thể test FE nối BE mà không cần quay lại Swagger cho mọi việc nhỏ.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <Link className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50" to="/login">
                  Quay lai login
                </Link>
                <a className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50" href="http://localhost:5001/api-docs" target="_blank" rel="noreferrer">
                  Mo Swagger
                </a>
                <a className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50" href="http://localhost:5001/health" target="_blank" rel="noreferrer">
                  Mo health check
                </a>
              </div>
            </section>

            <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-blue-900">Ghi chu Swagger</h2>
              <p className="mt-2 text-sm leading-6 text-blue-900/80">
                GET list agencies khong co parameter nen Swagger hien "No parameters" la binh thuong. Phan thieu truoc do la request body cho POST, PUT va cac mo ta field, toi da bo sung o backend de form Try it out hien ro hon.
              </p>
            </section>
          </div>
        </section>
      </div>
    </div>
  )
}