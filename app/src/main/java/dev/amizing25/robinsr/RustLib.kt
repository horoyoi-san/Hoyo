package dev.amizing25.robinsr

import dev.amizing25.robinsr.logging.LogRepository

class RustLib {
    companion object {
        init {
            System.loadLibrary("robinsr")
        }
    }
    external fun init(path: String)
    external fun startServer()
    external fun stopServer()

    fun onLog(message: String) {
        LogRepository.addLog(message)
    }
}