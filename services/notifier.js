import nodemailer from 'nodemailer'

export class Notifier {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        })
    }

    async sendBuildNotification(build, recipents) {
        const subject = `Build ${build.status}: ${build.repo}`
        const message = this.buildEmailTemplate(build)

        for (const recipient of recipents) {
            try {
                await this.transporter.sendMail({
                    from: process.env.EMAIL,
                    to: recipient,
                    subject,
                    html: message
                })
                console.log(`📧 Notification sent to ${recipient}`);
            } catch (error) {
                console.error(`Failed to send email to ${recipient}: ${error.message}`)
            }
        }

    }

    buildEmailTemplate(build) {
        return `
      <h2>Build ${build.status.toUpperCase()}</h2>
      <p><strong>Repository:</strong> ${build.repo}</p>
      <p><strong>Branch:</strong> ${build.branch}</p>
      <p><strong>Duration:</strong> ${build.duration ? Math.round(build.duration / 1000) + 's' : 'N/A'}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      ${build.status === 'failure' ? '<p style="color: #d32f2f;">❌ Build failed. Please check the logs.</p>' : ''}
      ${build.status === 'success' ? '<p style="color: #388e3c;">✅ Build completed successfully!</p>' : ''}
    `
    }
}

