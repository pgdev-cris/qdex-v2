import { Activity, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'

const COLUMNS = ['Transaction ID', 'Type', 'Amount', 'Channel', 'Status', 'Timestamp', 'Actions']

export function MonitoringPage() {
    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold">
                        <Activity className="text-muted-foreground h-5 w-5" />
                        Monitoring
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Real-time transaction monitoring and audit log.
                    </p>
                </div>
                <Button variant="outline">
                    <Activity className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle>Transaction Log</CardTitle>
                            <CardDescription>Live feed of all transaction activity.</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
                            <Input placeholder="Search log..." className="pl-8" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                {COLUMNS.map((col) => (
                                    <th
                                        key={col}
                                        className="text-muted-foreground px-4 py-3 text-left text-xs font-medium tracking-wide"
                                    >
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td
                                    colSpan={COLUMNS.length}
                                    className="text-muted-foreground py-16 text-center text-sm"
                                >
                                    No activity found.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    )
}
