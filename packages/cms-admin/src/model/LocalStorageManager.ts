class LocalStorageManager {
	get(key: LocalStorageManager.Keys) {
		return localStorage.getItem(key)
	}

	set(key: LocalStorageManager.Keys, value: string) {
		return localStorage.setItem(key, value)
	}

	unset(key: LocalStorageManager.Keys) {
		return localStorage.removeItem(key)
	}
}

namespace LocalStorageManager {
	export enum Keys {
		API_TOKEN = 'api_token'
	}
}

export default LocalStorageManager