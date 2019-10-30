# Contember

## Repository Structure

~~~
/packages = reusable TypeScript libraries which will later be published as open-source
/projects = individual projects
/instances = set of projects, which run on a single contember instance
~~~

## Docker dev setup

### Initial setup

- create `docker-compose.override.yaml` using `docker-compose.override.dist.yaml`
- create `instances/mangoweb/api/src/config/config.yaml`  using `instances/mangoweb/api/src/config/config.sample.yaml`
- run `./docker/bootstrap.sh` 
- follow instructions

### Regular run

- run `docker-compose up`

### Running tests

- run `./docker/npm test`

### Generating project migrations

- run `npm run cli diff project migration-name` (e.g. `npm run cli diff mangoweb gallery`)
- review generated file
- restart API using `npm run restart-api`


## Misc

We use [Lerna](https://lernajs.io/) to help with a few things

### Install or update dependencies

```sh
npm ci && \
npm run bootstrap
```

Instead of `npm run bootstrap` you may also use `npm run bootstrap:hoist`. The hoist option deduplicates `node_modules` structure into one shared folder and per package differences. This makes the installation faster but the build is less reliable as it differs from CI. In case of broken symlinks you can run `lerna link` to restore them.


### Running and debugging individual tests in PhpStorm

Currently it is not possible to use a remote Node.js interpreter for Mocha tests so you need a local node interpreter. 

- Go to `Run / Edit configurations / Templates / Mocha`
- Paste following ENV variables
```
TS_NODE_PROJECT=tsconfig.devTests.json
TEST_DB_HOST=127.0.0.1
TEST_DB_PASSWORD=contember
TEST_DB_NAME=tests
TEST_DB_PORT=4479
TEST_CWD_SUFFIX=/packages/cms-api
NODE_ENV=development
TEST_DB_USER=contember
```
- This setup will use a database from docker-compose and also there is different tsconfig file optimized for test run.
- set Extra mocha options to `--require ts-node/register --timeout 15000`
- Go to test file and run or debug it  
