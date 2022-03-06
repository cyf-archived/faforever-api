import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import axios from 'axios';
import { UserService } from './user.service';
import { PrismaService } from './prisma.service';

const baseURL = 'http://magict.cn:5000/webapi';

axios.defaults.withCredentials = true;

const request = (url, option = {}) => {
  return axios.request({
    url,
    baseURL,
    withCredentials: true,
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
  titles: any = {};
  bot: any;
  sid: string;

  onApplicationBootstrap() {
    this.login().then(() => {
      this.load();
    });
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
    return title
      .split(/-/)
      .map((i) =>
        `${i ?? ''}`
          .replace(/(\d)+\.(\d)+\.(\d)+/g, '') // 删除xx.xx.xx日期
          .replace(/（(.*)）|【(.*)】|\[(.*)\]|\((.*)\)/g, '') // 删除诸如 [无损] （录音室版） 等后缀
          .trim(),
      )
      .filter((i) => !/(.*)歌友会(.*)|(.*)茶话会(.*)|(.*)陈一发(.*)/.test(i)) // 过滤分段中是 xxx会 和发姐名字的片段
      .map((i) => i.toLocaleLowerCase())
      .join('');
  }

  getPaths() {
    const title2paths = this.musics.reduce((result, item) => {
      const title = this.getTitleSort(item.title);
      if (!result[title]) {
        result[title] = [];
      }
      result[title].push(item.path);
      return result;
    }, {});

    this.titles = title2paths;

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

    return await this.prismaService.like.create({
      data: {
        userId: user.id,
        path,
      },
    });
  }

  @Interval(5 * 60 * 1000)
  async load() {
    console.log('load ds data');
    const { data } = await this.getEntry();
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

  @Cron('0 0 0 * * *')
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

  async getLrc(song_title: string) {
    const bitbucket = `https://bitbucket.org/rojerchen95/faforever-lrc/raw/master/${encodeURI(
      song_title,
    )}.lrc?_t=${new Date().valueOf()}`;
    try {
      const { data } = await axios.get(bitbucket);

      return data;
    } catch (error) {
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

        if (lrc_result.code === 200 && lrc_result.lrc.lyric)
          return `[00:00.000] 歌词来自网络可能不准~\n${lrc_result.lrc.lyric}`;
      }

      console.log('title', title);

      return '[0:0.00]暂无歌词';
    }
  }
}
