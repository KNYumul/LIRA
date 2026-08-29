import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

export const liraAlert = Swal.mixin({
  confirmButtonColor: '#D97F76',
  cancelButtonColor: '#9C9793',
  reverseButtons: true,
  buttonsStyling: true,
  customClass: {
    popup: 'lira-sweet-alert',
    confirmButton: 'lira-sweet-alert-button',
    cancelButton: 'lira-sweet-alert-button'
  }
})

export function showError(message, title = 'Something went wrong') {
  return liraAlert.fire({ icon: 'error', title, text: message })
}

export function showWarning(message, title = 'Please check your entry') {
  return liraAlert.fire({ icon: 'warning', title, text: message })
}
