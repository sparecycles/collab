export function formData(formElement) {
    const data = {}
    new FormData(formElement).forEach((value, key) => { data[key] = value })
    return data
}

export function sendFormData(target, form, { method = 'post' } = {}) {
    /** @type {import('react').FormEventHandler} */
    return fetch(target, {
        method,
        body: new URLSearchParams(form instanceof HTMLFormElement ? new FormData(form) : form),
    })
}
