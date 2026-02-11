import { useEffect, useState } from 'react'
import { Sun, CheckCircle, Clock } from 'lucide-react'

interface Email {
    id: string;
    sender: string;
    subject: string;
    snippet: string;
    priorityScore?: number;
}

interface DailyBriefingProps {
    emails: Email[];
}

export function DailyBriefing({ emails }: DailyBriefingProps) {
    const [briefing, setBriefing] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ urgent: 0, avgResponseTime: '0m', cleared: 0 })

    useEffect(() => {
        const generateBriefing = async () => {
            try {
                setLoading(true)

                if (emails.length === 0) {
                    setBriefing('**Inbox Zero! 🎉**\n\nYou have no emails to process. Great job!')
                    setStats({ urgent: 0, avgResponseTime: '0m', cleared: 0 })
                    setLoading(false)
                    return
                }

                // Analyze emails
                const urgentEmails = emails.filter(e => e.priorityScore && e.priorityScore > 80)
                const importantEmails = emails.filter(e => e.priorityScore && e.priorityScore > 60 && e.priorityScore <= 80)

                let briefingText = `**Good ${getGreeting()}!**\n\n`

                if (urgentEmails.length > 0) {
                    briefingText += `You have **${urgentEmails.length} urgent email${urgentEmails.length > 1 ? 's' : ''}** that need attention:\n\n`

                    for (let i = 0; i < Math.min(3, urgentEmails.length); i++) {
                        const email = urgentEmails[i]
                        briefingText += `${i + 1}. **${email.sender}**: ${email.subject}\n`
                    }
                } else if (importantEmails.length > 0) {
                    briefingText += `You have **${importantEmails.length} important email${importantEmails.length > 1 ? 's' : ''}** to review.\n\n`
                } else {
                    briefingText += `You have **${emails.length} email${emails.length > 1 ? 's' : ''}** in your inbox.\n\n`
                }

                briefingText += `\n📊 **Inbox Health**: ${calculateInboxHealth(emails)}%`

                setBriefing(briefingText)
                setStats({
                    urgent: urgentEmails.length,
                    avgResponseTime: '12m', // Could calculate from actual data
                    cleared: 0 // Would track from storage
                })

            } catch (e) {
                console.error('Error generating briefing:', e)
                setBriefing('Could not generate briefing.')
            } finally {
                setLoading(false)
            }
        }

        generateBriefing()
    }, [emails])

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Morning'
        if (hour < 18) return 'Afternoon'
        return 'Evening'
    }

    const calculateInboxHealth = (emails: Email[]) => {
        if (emails.length === 0) return 100
        const urgentCount = emails.filter(e => e.priorityScore && e.priorityScore > 80).length
        const health = Math.max(0, 100 - (urgentCount * 10) - (emails.length * 2))
        return Math.round(health)
    }

    if (loading) {
        return (
            <div className="p-6 bg-surface border border-white/10 rounded-xl animate-pulse">
                <div className="h-6 w-1/3 bg-white/10 rounded mb-4"></div>
                <div className="space-y-2">
                    <div className="h-4 w-full bg-white/5 rounded"></div>
                    <div className="h-4 w-5/6 bg-white/5 rounded"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-surface border border-white/10 rounded-xl overflow-hidden font-sans">
            <div className="bg-gradient-to-r from-primary/20 to-surface p-4 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-2 text-white font-semibold">
                    <Sun className="text-yellow-400 w-5 h-5" />
                    Daily Briefing
                </div>
                <span className="text-xs text-gray-400">{new Date().toLocaleDateString()}</span>
            </div>

            <div className="p-5 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {briefing}
            </div>

            <div className="px-5 pb-5 grid grid-cols-2 gap-3">
                <div className="bg-background/50 p-3 rounded-lg flex items-center gap-3">
                    <Clock className="text-urgent w-4 h-4" />
                    <div>
                        <div className="text-xs text-gray-500">Urgent</div>
                        <div className="text-white font-medium">{stats.urgent}</div>
                    </div>
                </div>
                <div className="bg-background/50 p-3 rounded-lg flex items-center gap-3">
                    <CheckCircle className="text-newsletter w-4 h-4" />
                    <div>
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="text-white font-medium">{emails.length}</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
