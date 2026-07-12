# project-management — Delta Spec (change: prisma-schema)

Reconstructed from Engram observation id 111.

## ADDED Requirements

### Requirement: Project CRUD Module

The system MUST provide a `ProjectsModule` with a `ProjectsService` that supports create, findAll, findOne, update, and delete operations backed by `PrismaService`.

#### Scenario: Create project

- GIVEN a valid CreateProjectDto with `name`
- WHEN `POST /projects` is called
- THEN the project is persisted via `prisma.project.create` and the created record is returned

#### Scenario: Create project with optional description

- GIVEN a CreateProjectDto with `name` and `description`
- WHEN `POST /projects` is called
- THEN both fields are persisted and returned

#### Scenario: List all projects

- GIVEN one or more projects exist
- WHEN `GET /projects` is called
- THEN all project records are returned

#### Scenario: Project not found returns 404

- GIVEN no project with the given id exists
- WHEN `GET /projects/:id` is called
- THEN a 404 Not Found response is returned (`findOne` returns null for the not-found case; `update`/`remove` throw NotFoundException on P2025)
