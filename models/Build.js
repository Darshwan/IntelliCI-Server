import mongoose from 'mongoose';

const buildSchema = new mongoose.Schema({
    repo: {
        type: String,
        required: true
    },
    branch: {
        type: String,
        default: 'main'
    },
    commit: {
        hash: String,
        message: String,
        author: String
    },
    status: {
        type: String,
        enum: ['pending', 'running', 'success', 'failure', 'error'],
        default: 'pending'
    },
    output: {
        type: String
    },
    duration: {
        type: Number
    },
    conclusion: {
        type: String
    },
}, {
    timestamps: true
}
)

buildSchema.index({ repo: 1, branch: 1, createdAt: -1 })
buildSchema.index({ repo: 1, status: 1 });
buildSchema.index({ createdAt: -1 });
buildSchema.index({ status: 1, createdAt: -1 });
export default mongoose.model('Build', buildSchema)