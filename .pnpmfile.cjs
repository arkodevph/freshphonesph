module.exports = {
  hooks: {
    readPackage(pkg) {
      // Infra needs Zod 4 internally; the API's existing validators use Zod 3.
      if (pkg.name === "@better-auth/infra") {
        pkg.dependencies = { ...pkg.dependencies, zod: "4.6.5" };

        delete pkg.peerDependencies.zod;
      }

      return pkg;
    },
  },
};
