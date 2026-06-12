# Вспомогательные команды для релиза.
# make push tag=x.y.z — ставит git-тег и пушит в origin (триггер GitHub Actions).
# make del tag=x.y.z  — удаляет тег локально и удалённо.

push:
	@git tag "$(tag)"
	@git push origin "$(tag)"

del:
	@git tag -d "$(tag)"
	@git push origin --delete "$(tag)"
