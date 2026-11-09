import { spawnSync } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

const [ffmpeg, imagePath, videoPath] = process.argv.slice(2);
if (!ffmpeg || !imagePath || !videoPath) throw new Error("Usage: node scripts/prepare-willow-hero.mjs /path/to/ffmpeg /path/to/original.png /path/to/original.mp4");
const output = path.resolve("public/media/laneway");
await mkdir(output, { recursive: true });
const poster = await sharp(imagePath).resize(1664, 936, { fit: "cover" }).toBuffer();
await sharp(poster).webp({ quality: 88, effort: 6 }).toFile(path.join(output, "willow-nook-laneway-poster.webp"));
await sharp(poster).extract({ left: 286, top: 0, width: 526, height: 936 }).webp({ quality: 86, effort: 6 }).toFile(path.join(output, "willow-nook-laneway-poster-mobile.webp"));

function render(mobile) {
  const crop = mobile ? ",crop=404:720:220:0" : "";
  const image = `[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720${crop},setsar=1,format=yuv420p,split=2[stillA][stillB];`;
  const intro = "[stillA]trim=end_frame=48,setpts=PTS-STARTPTS,fps=24,fade=t=out:s=44:n=4[intro];";
  const outroFrames = mobile ? 60 : 48;
  const outro = `[stillB]trim=end_frame=${outroFrames},setpts=PTS-STARTPTS,fps=24,fade=t=in:s=0:n=4[outro];`;
  const wide = `[1:v]trim=start_frame=12:end_frame=48,setpts=PTS-STARTPTS${crop},setsar=1,format=yuv420p,fps=24[wide];`;
  const parents = mobile ? "[wide]fade=t=in:s=0:n=4,fade=t=out:s=32:n=4[motion];" : "[1:v]trim=start_frame=49:end_frame=93,setpts=PTS-STARTPTS,setsar=1,format=yuv420p,fps=24[parents];[wide][parents]concat=n=2:v=1:a=0,fps=24,fade=t=in:s=0:n=4,fade=t=out:s=76:n=4[motion];";
  const frames = mobile ? 144 : 176;
  const filters = image + intro + outro + wide + parents +
    "[intro][motion][outro]concat=n=3:v=1:a=0,fps=24,format=yuv420p[final]";
  const name = mobile ? "willow-nook-laneway-hero-mobile.mp4" : "willow-nook-laneway-hero-desktop.mp4";
  const args = ["-hide_banner", "-y", "-loop", "1", "-framerate", "24", "-i", imagePath, "-i", videoPath,
    "-filter_complex_threads", "1", "-filter_complex", filters, "-map", "[final]", "-an", "-frames:v", String(frames), "-r", "24",
    "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", path.join(output, name)];
  const result = spawnSync(ffmpeg, args, { encoding: "utf8", maxBuffer: 5_000_000 });
  if (result.status !== 0) throw new Error(result.stderr);
  return { name, frames, durationSeconds: frames / 24, dimensions: mobile ? "404×720" : "1280×720" };
}
const films = [render(false), render(true)];
const inputs = await Promise.all([imagePath, videoPath].map(async file => ({ name: path.basename(file), sha256: createHash("sha256").update(await readFile(file)).digest("hex") })));
const files = await Promise.all([...films.map(f => f.name), "willow-nook-laneway-poster.webp", "willow-nook-laneway-poster-mobile.webp"].map(async name => ({ name, bytes: (await stat(path.join(output, name))).size })));
const report = { inputs, films, files, edit: "Still opening; source frames 12–47 (clean exterior family); desktop also retains frames 49–92 (parents). Eight-frame fade-through-black transitions avoid overlapping people; identical still at loop boundaries. Mobile omits the close-up to avoid cropping faces." };
await mkdir("/private/tmp/willow-film-review", { recursive: true });
await writeFile("/private/tmp/willow-film-review/render-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
