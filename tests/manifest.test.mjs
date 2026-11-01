// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Daniel Braniewski. See the LICENSE file for rights and obligations.
// Manifest, URL, and package-integrity checks for Runyth Cycle Portrait.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = (name) => path.join(root, name);
const readJson = (name) => JSON.parse(readFileSync(repo(name), "utf8"));

const manifest = readJson("module.json");
const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");

test("manifest identity", () => {
  assert.equal(manifest.id, "runyth-cycle-portrait");
  assert.equal(manifest.title, "Runyth Cycle Portrait");
  assert.equal(manifest.authors.length, 1);
  assert.equal(manifest.authors[0].name, "Runyth");
  assert.equal(manifest.authors[0].url, "https://github.com/Runyth");
});

test("manifest URL surfaces", () => {
  const version = manifest.version;
  assert.equal(manifest.license, "LICENSE");
  assert.equal(manifest.url, "https://github.com/Runyth/foundry-runyth-cycle-portrait");
  assert.equal(manifest.manifest, "https://github.com/Runyth/foundry-runyth-cycle-portrait/releases/latest/download/module.json");
  assert.equal(
    manifest.download,
    `https://github.com/Runyth/foundry-runyth-cycle-portrait/releases/download/v${version}/runyth-cycle-portrait-v${version}-mod.zip`
  );
});

test("package metadata agrees with the manifest", () => {
  assert.equal(packageJson.name, manifest.id);
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.type, "module");
  assert.equal(packageJson.version, manifest.version);
  assert.equal(packageJson.license, "AGPL-3.0-or-later");
  assert.ok(packageJson.engines.node.includes("22.13.0"));
  assert.equal(packageLock.packages[""].version, manifest.version);
  assert.equal(packageLock.packages[""].license, "AGPL-3.0-or-later");
  assert.equal(packageLock.name, manifest.id);
});

test("manifest runtime files and localization trees", () => {
  assert.equal(manifest.compatibility.minimum, "13");
  assert.ok(manifest.compatibility.verified);
  for (const entry of manifest.esmodules) {
    assert.ok(existsSync(repo(entry)), `${entry} must exist`);
  }
  for (const style of manifest.styles) {
    assert.ok(existsSync(repo(style)), `${style} must exist`);
  }
  for (const language of manifest.languages) {
    assert.ok(existsSync(repo(language.path)), `${language.path} must exist`);
    assert.doesNotThrow(() => JSON.parse(readFileSync(repo(language.path), "utf8")));
  }
  for (const asset of ["assets/frame.svg", "assets/gallery.svg", "assets/portrait.svg"]) {
    assert.ok(existsSync(repo(asset)), `${asset} must exist`);
  }
  assert.ok(existsSync(repo("README.md")));
  assert.ok(existsSync(repo("CHANGELOG.md")));
});

test("the localization namespace follows the module family prefix", () => {
  for (const language of manifest.languages) {
    const data = JSON.parse(readFileSync(repo(language.path), "utf8"));
    assert.ok(Object.keys(data).includes("RCP"), `${language.path} namespace`);
  }
});
