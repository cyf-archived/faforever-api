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
            if (song?.additional?.song_audio?.duration / 60 < 7) {
              musics.push(song);
            }
          }
        }
      }

      this.musics = musics;
      this.all_musics = all_musics;
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
}
