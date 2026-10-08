/** Project consumers depend only on the standard repository contract. */
export function createProjectRepository(repository) {
  return Object.freeze({
    get: id => repository.get(id),
    list: () => repository.list(),
    save: project => repository.save(project),
    delete: id => repository.delete(id),
  });
}
