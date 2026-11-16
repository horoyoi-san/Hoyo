export type ModalConfig = {
    id: string
    title: string
    isOpen: boolean
    onClose: () => void
    content: React.ReactNode
}