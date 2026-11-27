# Установка: частые проблемы

Что делать, если шаг из [гайда по установке](setup.md) не прошёл. Сначала стоит запустить `npx wastech-learn doctor` в контент-репозитории: он называет проблему и исправление для каждой проверки.

| Симптом | Что делать |
| --- | --- |
| `npm ci` пишет `Unsupported engine` | Node старше 24.17: `nvm install 24 && nvm alias default 24`, новый терминал |
| `nvm: command not found` у агента | В начале команды `. "$HOME/.nvm/nvm.sh"` |
| `doctor` чист, а MCP-серверов нет в `/mcp` | Агент запущен не из терминала и видит другой Node: запусти его из терминала или поставь Node 24 системно; серверы нужно разрешить |
| `ENOSPC: System limit for number of file watchers reached` | Linux: `echo fs.inotify.max_user_watches=524288 \| sudo tee /etc/sysctl.d/60-inotify.conf && sudo sysctl --system` |
| Порт 4747 занят | Уже запущен другой `serve`: закрой его или `--port 4848` |
| «Синхронизировать» просит закончить в терминале | git ждёт пароль или идёт чужой rebase: `gh auth setup-git` или закончи rebase вручную |

## См. также

- [Установка с чистого листа](setup.md) · [Синхронизация](architecture/sync.md)
