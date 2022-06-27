import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import axios from 'axios';
import { UserService } from './user.service';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

const baseURL = 'http://[2409:8a28:2405:b751::a7b]:5000/webapi';

axios.defaults.withCredentials = true;

const request = (url, option = {}) => {
  return axios.request({
    url,
    baseURL,
    withCredentials: true,
    timeout: 10 * 1000,
    ...option,
  });
};

@Injectable()
export class AppService implements OnApplicationBootstrap {
  @Inject()
  private userService: UserService;
  @Inject()
  private prismaService: PrismaService;

  cookie: string[] = [];
  criteria: any[] = [];
  songs: any = {};
  musics: any[] = [];
  all_musics: any[] = [];
  most_sing: any[] = [];
  titles: any = {};
  bot: any;
  sid: string;

  onApplicationBootstrap() {
    this.load();
  }

  getHello(): string {
    return 'v1.0.0';
  }

  getCriteria() {
    return this.criteria;
  }

  getSongs() {
    return this.songs;
  }

  getMusics() {
    return this.musics;
  }

  getTitleSort(title: string) {
    if (title.indexOf('我陈一发最牛逼') >= 0) return '我陈一发最牛逼';
    return title
      .split(/-+|－+|—+/)
      .map((i) =>
        `${i ?? ''}`
          .replace(/\d{8}/g, '') // 删除xx.xx.xx日期
          .replace(/(\d)+\.(\d)+\.(\d)+/g, '') // 删除xx.xx.xx日期
          .replace(/（(.*)）|【(.*)】|\[(.*)\]|\((.*)\)/g, '') // 删除诸如 [无损] （录音室版） 等后缀
          .trim(),
      )
      .filter((i) => !/(.*)歌友会(.*)|(.*)茶话会(.*)|(.*)陈一发(.*)/.test(i)) // 过滤分段中是 xxx会 和发姐名字的片段
      .map((i) => i.trim().toLocaleLowerCase())
      .join('');
  }

  getPaths() {
    const title2paths = this.all_musics.reduce((result, item) => {
      const title = this.getTitleSort(item.title);
      if (!result[title]) {
        result[title] = [];
      }
      result[title].push(item.path);
      return result;
    }, {});

    this.titles = title2paths;
    this.most_sing = Object.keys(title2paths).reduce<any>((ret, title) => {
      if (!title) return ret;
      let target = ret.find((i) => i.title === title);
      if (!target) {
        target = {
          title,
          count: 0,
        };
        ret.push(target);
      }

      target.count += title2paths[title].length;

      return ret;
    }, []);

    this.most_sing.sort((a, b) => b.count - a.count);

    let max = 0;

    let max_title = '';
    for (const key in this.songs) {
      for (let index = 0; index < this.songs[key].length; index++) {
        const song = this.songs[key][index];
        const title = this.getTitleSort(song.title);
        this.songs[key][index].paths = this.titles[title] ?? [];
        if (
          this.songs[key][index].paths.length > max &&
          this.songs[key][index].paths.length < 59
        ) {
          max = this.songs[key][index].paths.length;
          max_title = title;
        }
        this.songs[key][index].search_key = title;
      }
    }

    return {
      max,
      max_title,
      titles: this.titles,
    };
  }

  getSid() {
    return { sid: this.sid };
  }

  getRandom() {
    const index = Math.floor(Math.random() * this.musics.length);
    return this.musics[index] ?? this.musics[0] ?? {};
  }

  async getMyLike(uuid) {
    const user = await this.userService.findOrCreate(uuid);

    const likes = await this.prismaService.like.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const likeMusics = [];
    for (const like of likes) {
      const target = this.all_musics.find((i) => i.path === like.path);
      if (target) {
        likeMusics.push(target);
      }
    }
    return likeMusics;
  }

  async likeOne(uuid, path) {
    const user = await this.userService.findOrCreate(uuid);

    const exist = await this.prismaService.like.findFirst({
      where: {
        userId: user.id,
        path,
      },
    });

    if (exist) {
      return await this.prismaService.like.delete({ where: { id: exist.id } });
    }
    const target = this.all_musics.find((i) => i.path === path);

    return await this.prismaService.like.create({
      data: {
        userId: user.id,
        path,
        name: target ? this.getTitleSort(target.title) : null,
      },
    });
  }

  async build() {
    const likes = await this.prismaService.like.findMany({
      where: {
        name: null,
      },
    });

    for (const like of likes) {
      const target = this.all_musics.find((i) => i.path === like.path);
      if (target) {
        await this.prismaService.like.update({
          where: { id: like.id },
          data: {
            name: this.getTitleSort(target.title),
          },
        });
      }
    }
  }

  async hot() {
    const like_hot = await this.prismaService.$queryRaw(
      Prisma.sql`select \`name\` as \`title\`, count(\`id\`) as \`count\` from \`Like\` where \`name\` <> '' OR \`name\` is not null group by \`name\` order by \`count\` DESC`,
    );

    return {
      like_hot,
      sing_hot: this.most_sing,
      titles: this.titles,
    };
  }

  @Cron('0 0 */24 * * *')
  async load() {
    console.log('load ds data');
    await this.login();
    console.log('login success');
    const { data } = await this.getEntry();
    console.log('getEntry success');
    if (data.data && data.data.albums.length > 0) {
      this.criteria = data.data.albums;
      const musics = [];
      const all_musics = [];

      for (let index = 0; index < this.criteria.length; index++) {
        const albums = this.criteria[index];
        const { data: songs } = await this.loadSongs(
          albums.name,
          albums.album_artist,
        );
        console.log('loadSongs success');
        if (songs.data && songs.data.songs.length > 0) {
          this.songs[albums.name] = songs.data.songs;
          this.criteria[index].count = songs.data.songs.length;
          for (const song of songs.data.songs) {
            all_musics.push(song);
            if (
              // song?.additional?.song_audio?.duration / 60 < 7 &&
              !['直播聊天邮件合集', '直播集锦', '特别活动'].includes(
                song?.additional?.song_tag?.album,
              )
            ) {
              musics.push(song);
            }
          }
        }
      }

      this.musics = musics;
      this.all_musics = all_musics;
      this.getPaths();
    }
  }

  async login() {
    const { data, headers } = await request(
      '/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=cyfwlp&passwd=5267373&session=AudioStation&format=cookie',
    );
    if (headers['set-cookie']) {
      this.cookie = headers['set-cookie'];
      this.sid = data.data.sid;
    }
  }

  async getEntry() {
    return await request(`/AudioStation/album.cgi`, {
      method: 'POST',
      data: 'api=SYNO.AudioStation.Album&method=list&version=1&library=all&sort_direction=asc&offset=0&sort_by=name&limit=5000',
      headers: {
        cookie: this.cookie,
      },
    });
  }

  async loadSongs(album, album_artist) {
    return request(`/AudioStation/song.cgi`, {
      method: 'POST',
      data: `api=SYNO.AudioStation.Song&method=list&version=3&library=all&additional=song_tag%2Csong_audio%2Csong_rating&album=${encodeURIComponent(
        album,
      )}&offset=0&album_artist=${encodeURIComponent(album_artist)}&limit=50000`,
      headers: {
        cookie: this.cookie,
      },
    });
  }

  async contributeLrc(title: string, lrc: string) {
    const is = await this.prismaService.lrc.count({
      where: {
        title,
        checked: true,
      },
    });

    if (is > 0) {
      return { msg: '歌曲已有人贡献，感谢您的提交。', type: 'warning' };
    }

    await this.prismaService.lrc.create({
      data: {
        title,
        lrc,
      },
    });

    return { msg: '贡献成功，等待管理员审核~', type: 'success' };
  }

  async getLrc(song_title: string) {
    try {
      const lrc = await this.prismaService.lrc.findFirst({
        where: {
          title: song_title,
          checked: true,
        },
      });
      if (lrc) return lrc.lrc;
      const title = this.getTitleSort(song_title);
      const { data: songs_result } = await axios.get(
        'http://neteasecloudmusicapi.eqistu.cn/cloudsearch',
        {
          params: { keywords: title },
        },
      );
      if (songs_result.code === 200 && songs_result.result.songCount > 0) {
        const id = songs_result.result.songs[0].id;
        const { data: lrc_result } = await axios.get(
          'http://neteasecloudmusicapi.eqistu.cn/lyric',
          {
            params: { id },
          },
        );
        if (
          lrc_result.code === 200 &&
          lrc_result.lrc.lyric &&
          lrc_result.sgc === false
        ) {
          return `[00:00.000] 此歌词来自网络可能不准~\n${lrc_result.lrc.lyric}`;
        }
      }
    } catch (error) {
      //,,
    }
    return '[0:0.00]暂无歌词';
  }
}
